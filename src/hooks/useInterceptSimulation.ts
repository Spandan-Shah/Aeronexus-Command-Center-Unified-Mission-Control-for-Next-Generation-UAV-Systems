import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   MissionNexus
   Autonomous Intercept Simulation

   Phase 1
   - Two fixed-wing aircraft
   - Browser Gamepad / RadioMaster leader control
   - Baseline trajectory predictor
   - Online quadratic regression predictor
   - Autonomous follower guidance
   - Non-contact safety gate
   ========================================================= */

export type InterceptMode =
  | "IDLE"
  | "ACQUIRE"
  | "TRACK"
  | "PREDICT"
  | "RENDEZVOUS"
  | "SHADOW"
  | "HOLD"
  | "ABORT"
  | "RTL";

export type PredictorMode =
  | "baseline"
  | "ml";

export type Vector2 = {
  x: number;
  y: number;
};

export type AircraftState =
  Vector2 & {
    id: number;
    callsign: string;
    heading: number;
    airspeed: number;
    altitude: number;
    turnRate: number;
    bank: number;
    mode: string;
  };

export type GamepadState = {
  connected: boolean;
  id: string;
  steeringAxis: number;
  speedAxis: number;
};

export type PredictionPerformance = {
  baselineErrorMeters:
    number | null;

  mlErrorMeters:
    number | null;

  improvementPercent:
    number | null;

  validationSamples:
    number;
};

export type InterceptSnapshot = {
  running: boolean;

  mode:
    InterceptMode;

  predictorMode:
    PredictorMode;

  simTimeSeconds:
    number;

  leader:
    AircraftState;

  follower:
    AircraftState;

  leaderTrail:
    Vector2[];

  followerTrail:
    Vector2[];

  baselinePath:
    Vector2[];

  mlPath:
    Vector2[];

  guidanceTarget:
    Vector2;

  home:
    Vector2;

  distanceMeters:
    number;

  closingRateMps:
    number;

  relativeBearingDegrees:
    number;

  etaSeconds:
    number | null;

  desiredSeparationMeters:
    number;

  minimumSeparationMeters:
    number;

  separationSafe:
    boolean;

  ai: {
    model: string;
    confidence: number;

    predictionHorizonSeconds:
      number;

    residualMeters:
      number;

    ready:
      boolean;
  };

  performance:
    PredictionPerformance;

  gamepad:
    GamepadState;
};

type TimedPoint =
  Vector2 & {
    t: number;
  };

type PredictionEvaluation = {
  dueAt: number;
  baseline: Vector2;
  ml: Vector2;
};

type RegressionModel = {
  predict: (
    secondsAhead: number,
  ) => Vector2;

  residualMeters:
    number;
};

type InternalSimulation = {
  running: boolean;

  mode:
    InterceptMode;

  modeSince:
    number;

  predictorMode:
    PredictorMode;

  simTimeSeconds:
    number;

  leader:
    AircraftState;

  follower:
    AircraftState;

  home:
    Vector2;

  desiredSeparationMeters:
    number;

  minimumSeparationMeters:
    number;

  leaderTrail:
    Vector2[];

  followerTrail:
    Vector2[];

  leaderHistory:
    TimedPoint[];

  evaluations:
    PredictionEvaluation[];

  baselineErrors:
    number[];

  mlErrors:
    number[];

  baselinePath:
    Vector2[];

  mlPath:
    Vector2[];

  guidanceTarget:
    Vector2;

  aiConfidence:
    number;

  aiResidualMeters:
    number;

  lastHistorySample:
    number;

  lastPredictionEvaluation:
    number;

  gamepad:
    GamepadState;
};

/* =========================================================
   Constants
   ========================================================= */

const PREDICTION_HORIZON_SECONDS =
  3;

const TRAIL_LIMIT =
  100;

const HISTORY_LIMIT =
  42;

const ERROR_HISTORY_LIMIT =
  24;

/* =========================================================
   Math
   ========================================================= */

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value,
    ),
  );
}

function toRadians(
  degrees: number,
) {
  return (
    degrees *
    Math.PI /
    180
  );
}

function toDegrees(
  radians: number,
) {
  return (
    radians *
    180 /
    Math.PI
  );
}

function normalizeHeading(
  heading: number,
) {
  return (
    (
      heading %
        360
    ) +
    360
  ) %
    360;
}

function normalizeSignedAngle(
  angle: number,
) {
  let result =
    normalizeHeading(
      angle,
    );

  if (
    result >
    180
  ) {
    result -=
      360;
  }

  return result;
}

function headingVector(
  heading: number,
): Vector2 {
  const radians =
    toRadians(
      heading,
    );

  return {
    x:
      Math.sin(
        radians,
      ),

    y:
      Math.cos(
        radians,
      ),
  };
}

function velocityVector(
  aircraft:
    AircraftState,
): Vector2 {
  const direction =
    headingVector(
      aircraft.heading,
    );

  return {
    x:
      direction.x *
      aircraft.airspeed,

    y:
      direction.y *
      aircraft.airspeed,
  };
}

function distanceBetween(
  a: Vector2,
  b: Vector2,
) {
  return Math.hypot(
    b.x -
      a.x,

    b.y -
      a.y,
  );
}

function bearingBetween(
  from: Vector2,
  to: Vector2,
) {
  const dx =
    to.x -
    from.x;

  const dy =
    to.y -
    from.y;

  return normalizeHeading(
    toDegrees(
      Math.atan2(
        dx,
        dy,
      ),
    ),
  );
}

function average(
  values: number[],
) {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    values.length
  );
}

/* =========================================================
   3 × 3 Linear Solver
   ========================================================= */

function solve3x3(
  matrix:
    number[][],
  vector:
    number[],
): number[] | null {
  const augmented =
    matrix.map(
      (
        row,
        index,
      ) => [
        ...row,
        vector[
          index
        ],
      ],
    );

  for (
    let column =
      0;
    column <
      3;
    column +=
      1
  ) {
    let pivot =
      column;

    for (
      let row =
        column +
        1;
      row <
        3;
      row +=
        1
    ) {
      if (
        Math.abs(
          augmented[
            row
          ][
            column
          ],
        ) >
        Math.abs(
          augmented[
            pivot
          ][
            column
          ],
        )
      ) {
        pivot =
          row;
      }
    }

    if (
      Math.abs(
        augmented[
          pivot
        ][
          column
        ],
      ) <
      1e-8
    ) {
      return null;
    }

    [
      augmented[
        column
      ],
      augmented[
        pivot
      ],
    ] = [
      augmented[
        pivot
      ],
      augmented[
        column
      ],
    ];

    const divisor =
      augmented[
        column
      ][
        column
      ];

    for (
      let item =
        column;
      item <
        4;
      item +=
        1
    ) {
      augmented[
        column
      ][
        item
      ] /=
        divisor;
    }

    for (
      let row =
        0;
      row <
        3;
      row +=
        1
    ) {
      if (
        row ===
        column
      ) {
        continue;
      }

      const factor =
        augmented[
          row
        ][
          column
        ];

      for (
        let item =
          column;
        item <
          4;
        item +=
          1
      ) {
        augmented[
          row
        ][
          item
        ] -=
          factor *
          augmented[
            column
          ][
            item
          ];
      }
    }
  }

  return [
    augmented[
      0
    ][
      3
    ],

    augmented[
      1
    ][
      3
    ],

    augmented[
      2
    ][
      3
    ],
  ];
}

/* =========================================================
   Online Quadratic Regression

   Fits:
   x(t) = a + bt + ct²
   y(t) = a + bt + ct²

   This gives us a small learned trajectory model which
   can represent curved leader motion better than the
   constant-velocity baseline.
   ========================================================= */

function fitQuadraticRegression(
  history:
    TimedPoint[],
): RegressionModel | null {
  if (
    history.length <
    10
  ) {
    return null;
  }

  const recent =
    history.slice(
      -30,
    );

  const latestTime =
    recent[
      recent.length -
        1
    ].t;

  const samples =
    recent.map(
      (
        point,
      ) => ({
        time:
          (
            point.t -
            latestTime
          ) /
          1000,

        x:
          point.x,

        y:
          point.y,
      }),
    );

  let s0 =
    0;

  let s1 =
    0;

  let s2 =
    0;

  let s3 =
    0;

  let s4 =
    0;

  let x0 =
    0;

  let x1 =
    0;

  let x2 =
    0;

  let y0 =
    0;

  let y1 =
    0;

  let y2 =
    0;

  samples.forEach(
    (
      sample,
    ) => {
      const t =
        sample.time;

      const t2 =
        t *
        t;

      s0 +=
        1;

      s1 +=
        t;

      s2 +=
        t2;

      s3 +=
        t2 *
        t;

      s4 +=
        t2 *
        t2;

      x0 +=
        sample.x;

      x1 +=
        sample.x *
        t;

      x2 +=
        sample.x *
        t2;

      y0 +=
        sample.y;

      y1 +=
        sample.y *
        t;

      y2 +=
        sample.y *
        t2;
    },
  );

  const matrix = [
    [
      s0,
      s1,
      s2,
    ],

    [
      s1,
      s2,
      s3,
    ],

    [
      s2,
      s3,
      s4,
    ],
  ];

  const coefficientsX =
    solve3x3(
      matrix,
      [
        x0,
        x1,
        x2,
      ],
    );

  const coefficientsY =
    solve3x3(
      matrix,
      [
        y0,
        y1,
        y2,
      ],
    );

  if (
    coefficientsX ===
      null ||
    coefficientsY ===
      null
  ) {
    return null;
  }

  /*
   * IMPORTANT:
   * TypeScript can lose control-flow narrowing when a
   * variable is captured inside a nested function.
   *
   * Copying the values after the null guard gives the
   * closure permanently non-null coefficient arrays.
   */
  const safeCoefficientsX:
    number[] =
    coefficientsX;

  const safeCoefficientsY:
    number[] =
    coefficientsY;

  function predict(
    secondsAhead:
      number,
  ): Vector2 {
    const t =
      secondsAhead;

    return {
      x:
        safeCoefficientsX[
          0
        ] +
        safeCoefficientsX[
          1
        ] *
          t +
        safeCoefficientsX[
          2
        ] *
          t *
          t,

      y:
        safeCoefficientsY[
          0
        ] +
        safeCoefficientsY[
          1
        ] *
          t +
        safeCoefficientsY[
          2
        ] *
          t *
          t,
    };
  }

  const squaredResiduals =
    samples.map(
      (
        sample,
      ) => {
        const predictedX =
          safeCoefficientsX[
            0
          ] +
          safeCoefficientsX[
            1
          ] *
            sample.time +
          safeCoefficientsX[
            2
          ] *
            sample.time *
            sample.time;

        const predictedY =
          safeCoefficientsY[
            0
          ] +
          safeCoefficientsY[
            1
          ] *
            sample.time +
          safeCoefficientsY[
            2
          ] *
            sample.time *
            sample.time;

        const error =
          distanceBetween(
            {
              x:
                predictedX,

              y:
                predictedY,
            },

            {
              x:
                sample.x,

              y:
                sample.y,
            },
          );

        return (
          error *
          error
        );
      },
    );

  const residualMeters =
    Math.sqrt(
      squaredResiduals.reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      ) /
        squaredResiduals.length,
    );

  return {
    predict,
    residualMeters,
  };
}

/* =========================================================
   Initial Simulation
   ========================================================= */

function createInitialSimulation():
  InternalSimulation {
  const now =
    performance.now();

  return {
    running:
      true,

    mode:
      "IDLE",

    modeSince:
      now,

    predictorMode:
      "ml",

    simTimeSeconds:
      0,

    leader: {
      id:
        1,

      callsign:
        "LEADER-01",

      x:
        240,

      y:
        120,

      heading:
        45,

      airspeed:
        22,

      altitude:
        120,

      turnRate:
        0,

      bank:
        0,

      mode:
        "AUTO DEMO",
    },

    follower: {
      id:
        2,

      callsign:
        "FOLLOWER-02",

      x:
        -430,

      y:
        -260,

      heading:
        42,

      airspeed:
        21,

      altitude:
        112,

      turnRate:
        0,

      bank:
        0,

      mode:
        "STANDBY",
    },

    home: {
      x:
        -430,

      y:
        -260,
    },

    desiredSeparationMeters:
      160,

    minimumSeparationMeters:
      80,

    leaderTrail:
      [],

    followerTrail:
      [],

    leaderHistory:
      [],

    evaluations:
      [],

    baselineErrors:
      [],

    mlErrors:
      [],

    baselinePath:
      [],

    mlPath:
      [],

    guidanceTarget: {
      x:
        0,

      y:
        0,
    },

    aiConfidence:
      0.4,

    aiResidualMeters:
      0,

    lastHistorySample:
      now,

    lastPredictionEvaluation:
      now,

    gamepad: {
      connected:
        false,

      id:
        "",

      steeringAxis:
        0,

      speedAxis:
        0,
    },
  };
}

/* =========================================================
   RadioMaster / Browser Gamepad
   ========================================================= */

function getConnectedGamepad():
  Gamepad | null {
  if (
    typeof navigator ===
      "undefined" ||
    !navigator.getGamepads
  ) {
    return null;
  }

  const gamepads =
    navigator.getGamepads();

  for (
    let index =
      0;
    index <
      gamepads.length;
    index +=
      1
  ) {
    const gamepad =
      gamepads[
        index
      ];

    if (
      gamepad
    ) {
      return gamepad;
    }
  }

  return null;
}

/* =========================================================
   Prediction
   ========================================================= */

function baselinePrediction(
  leader:
    AircraftState,
  secondsAhead:
    number,
): Vector2 {
  const velocity =
    velocityVector(
      leader,
    );

  return {
    x:
      leader.x +
      velocity.x *
        secondsAhead,

    y:
      leader.y +
      velocity.y *
        secondsAhead,
  };
}

function updatePredictions(
  simulation:
    InternalSimulation,
  now:
    number,
) {
  const regression =
    fitQuadraticRegression(
      simulation.leaderHistory,
    );

  const horizons = [
    0.75,
    1.5,
    2.25,
    3,
    3.75,
    4.5,
  ];

  simulation.baselinePath =
    horizons.map(
      (
        horizon,
      ) =>
        baselinePrediction(
          simulation.leader,
          horizon,
        ),
    );

  simulation.mlPath =
    regression
      ? horizons.map(
          (
            horizon,
          ) =>
            regression.predict(
              horizon,
            ),
        )
      : [
          ...simulation
            .baselinePath,
        ];

  simulation.aiResidualMeters =
    regression
      ?.residualMeters ??
    50;

  simulation.aiConfidence =
    regression
      ? clamp(
          0.96 -
            regression.residualMeters /
              120,
          0.45,
          0.96,
        )
      : 0.4;

  const remainingEvaluations:
    PredictionEvaluation[] =
    [];

  simulation.evaluations.forEach(
    (
      evaluation,
    ) => {
      if (
        evaluation.dueAt <=
        now
      ) {
        simulation.baselineErrors.push(
          distanceBetween(
            simulation.leader,
            evaluation.baseline,
          ),
        );

        simulation.mlErrors.push(
          distanceBetween(
            simulation.leader,
            evaluation.ml,
          ),
        );
      } else {
        remainingEvaluations.push(
          evaluation,
        );
      }
    },
  );

  simulation.evaluations =
    remainingEvaluations;

  simulation.baselineErrors =
    simulation.baselineErrors.slice(
      -ERROR_HISTORY_LIMIT,
    );

  simulation.mlErrors =
    simulation.mlErrors.slice(
      -ERROR_HISTORY_LIMIT,
    );

  if (
    now -
      simulation.lastPredictionEvaluation >
      700 &&
    simulation.leaderHistory.length >=
      12
  ) {
    simulation.lastPredictionEvaluation =
      now;

    simulation.evaluations.push(
      {
        dueAt:
          now +
          PREDICTION_HORIZON_SECONDS *
            1000,

        baseline:
          baselinePrediction(
            simulation.leader,
            PREDICTION_HORIZON_SECONDS,
          ),

        ml:
          regression
            ? regression.predict(
                PREDICTION_HORIZON_SECONDS,
              )
            : baselinePrediction(
                simulation.leader,
                PREDICTION_HORIZON_SECONDS,
              ),
      },
    );
  }
}

/* =========================================================
   Leader Dynamics
   ========================================================= */

function updateLeader(
  simulation:
    InternalSimulation,
  deltaSeconds:
    number,
) {
  const gamepad =
    getConnectedGamepad();

  if (
    gamepad
  ) {
    const steering =
      clamp(
        gamepad.axes[
          0
        ] ??
          0,
        -1,
        1,
      );

    const speedAxis =
      clamp(
        -(
          gamepad.axes[
            1
          ] ??
          0
        ),
        -1,
        1,
      );

    simulation.gamepad = {
      connected:
        true,

      id:
        gamepad.id,

      steeringAxis:
        steering,

      speedAxis,
    };

    simulation.leader.mode =
      "USB MANUAL";

    simulation.leader.turnRate =
      steering *
      11;

    const targetSpeed =
      22 +
      speedAxis *
        6;

    simulation.leader.airspeed +=
      (
        targetSpeed -
        simulation.leader
          .airspeed
      ) *
      Math.min(
        1,
        deltaSeconds *
          2,
      );
  } else {
    simulation.gamepad = {
      connected:
        false,

      id:
        "",

      steeringAxis:
        0,

      speedAxis:
        0,
    };

    simulation.leader.mode =
      "AUTO DEMO";

    const time =
      simulation.simTimeSeconds;

    simulation.leader.turnRate =
      clamp(
        Math.sin(
          time /
            4.6,
        ) *
          6.3 +
          Math.sin(
            time /
              1.65,
          ) *
            2.1,
        -9,
        9,
      );

    const targetSpeed =
      22 +
      Math.sin(
        time /
          7,
      ) *
        2.2;

    simulation.leader.airspeed +=
      (
        targetSpeed -
        simulation.leader
          .airspeed
      ) *
      Math.min(
        1,
        deltaSeconds *
          1.4,
      );
  }

  simulation.leader.heading =
    normalizeHeading(
      simulation.leader
        .heading +
        simulation.leader
          .turnRate *
          deltaSeconds,
    );

  simulation.leader.bank =
    clamp(
      simulation.leader
        .turnRate *
        3.1,
      -34,
      34,
    );

  const velocity =
    velocityVector(
      simulation.leader,
    );

  simulation.leader.x +=
    velocity.x *
    deltaSeconds;

  simulation.leader.y +=
    velocity.y *
    deltaSeconds;
}

/* =========================================================
   Guidance Target
   ========================================================= */

function calculateGuidanceTarget(
  simulation:
    InternalSimulation,
): Vector2 {
  const selectedPrediction =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath[
          3
        ] ??
        simulation.leader
      : simulation
          .baselinePath[
          3
        ] ??
        simulation.leader;

  const selectedPath =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath
      : simulation.baselinePath;

  let futureHeading =
    simulation.leader
      .heading;

  if (
    selectedPath.length >=
    2
  ) {
    futureHeading =
      bearingBetween(
        selectedPath[
          selectedPath.length -
            2
        ],

        selectedPath[
          selectedPath.length -
            1
        ],
      );
  }

  let separation =
    simulation.desiredSeparationMeters;

  if (
    simulation.mode ===
      "ACQUIRE" ||
    simulation.mode ===
      "TRACK"
  ) {
    separation +=
      30;
  }

  if (
    simulation.mode ===
    "RENDEZVOUS"
  ) {
    separation =
      Math.max(
        simulation.minimumSeparationMeters +
          35,

        simulation.desiredSeparationMeters -
          20,
      );
  }

  const direction =
    headingVector(
      futureHeading,
    );

  return {
    x:
      selectedPrediction.x -
      direction.x *
        separation,

    y:
      selectedPrediction.y -
      direction.y *
        separation,
  };
}

/* =========================================================
   Follower Dynamics
   ========================================================= */

function updateFollower(
  simulation:
    InternalSimulation,
  deltaSeconds:
    number,
) {
  const follower =
    simulation.follower;

  const leader =
    simulation.leader;

  const separation =
    distanceBetween(
      follower,
      leader,
    );

  let target:
    Vector2 = {
      x:
        follower.x,

      y:
        follower.y,
    };

  let targetSpeed =
    20;

  let maxTurnRate =
    9;

  if (
    simulation.mode ===
    "IDLE"
  ) {
    follower.mode =
      "STANDBY";

    follower.turnRate =
      0;

    targetSpeed =
      19;
  } else if (
    simulation.mode ===
    "HOLD"
  ) {
    follower.mode =
      "LOITER";

    follower.turnRate =
      5.2;

    targetSpeed =
      19;
  } else if (
    simulation.mode ===
    "ABORT"
  ) {
    follower.mode =
      "ABORT";

    const awayHeading =
      bearingBetween(
        leader,
        follower,
      );

    const awayVector =
      headingVector(
        awayHeading,
      );

    target = {
      x:
        follower.x +
        awayVector.x *
          450,

      y:
        follower.y +
        awayVector.y *
          450,
    };

    targetSpeed =
      24;

    maxTurnRate =
      11;
  } else if (
    simulation.mode ===
    "RTL"
  ) {
    follower.mode =
      "RTL";

    target = {
      ...simulation.home,
    };

    targetSpeed =
      22;

    maxTurnRate =
      10;
  } else {
    follower.mode =
      simulation.mode ===
      "SHADOW"
        ? "AI SHADOW"
        : "AI GUIDED";

    target =
      calculateGuidanceTarget(
        simulation,
      );

    const separationError =
      separation -
      simulation.desiredSeparationMeters;

    targetSpeed =
      leader.airspeed +
      clamp(
        separationError *
          0.025,
        -4,
        8,
      );

    if (
      simulation.mode ===
      "SHADOW"
    ) {
      targetSpeed =
        leader.airspeed +
        clamp(
          separationError *
            0.015,
          -2.5,
          3.5,
        );
    }
  }

  /*
   * Hard non-contact safety gate.
   * If the follower enters the protected radius,
   * it is commanded outward rather than toward the leader.
   */

  if (
    separation <
      simulation.minimumSeparationMeters &&
    simulation.mode !==
      "RTL" &&
    simulation.mode !==
      "ABORT"
  ) {
    const awayHeading =
      bearingBetween(
        leader,
        follower,
      );

    const awayVector =
      headingVector(
        awayHeading,
      );

    target = {
      x:
        follower.x +
        awayVector.x *
          300,

      y:
        follower.y +
        awayVector.y *
          300,
    };

    targetSpeed =
      Math.min(
        leader.airspeed -
          4,
        17,
      );

    maxTurnRate =
      12;
  }

  simulation.guidanceTarget =
    target;

  if (
    simulation.mode !==
      "IDLE" &&
    simulation.mode !==
      "HOLD"
  ) {
    const desiredHeading =
      bearingBetween(
        follower,
        target,
      );

    const headingError =
      normalizeSignedAngle(
        desiredHeading -
        follower.heading,
      );

    follower.turnRate =
      clamp(
        headingError *
          0.18,
        -maxTurnRate,
        maxTurnRate,
      );
  }

  follower.heading =
    normalizeHeading(
      follower.heading +
        follower.turnRate *
          deltaSeconds,
    );

  follower.bank =
    clamp(
      follower.turnRate *
        3.2,
      -38,
      38,
    );

  follower.airspeed +=
    (
      clamp(
        targetSpeed,
        15,
        32,
      ) -
      follower.airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.6,
    );

  const altitudeTarget =
    leader.altitude;

  follower.altitude +=
    clamp(
      altitudeTarget -
        follower.altitude,
      -2.5,
      2.5,
    ) *
    deltaSeconds;

  const velocity =
    velocityVector(
      follower,
    );

  follower.x +=
    velocity.x *
    deltaSeconds;

  follower.y +=
    velocity.y *
    deltaSeconds;
}

/* =========================================================
   State Machine
   ========================================================= */

function setInternalMode(
  simulation:
    InternalSimulation,
  mode:
    InterceptMode,
  now =
    performance.now(),
) {
  simulation.mode =
    mode;

  simulation.modeSince =
    now;
}

function updateAutomaticModeTransitions(
  simulation:
    InternalSimulation,
  now:
    number,
) {
  const elapsed =
    (
      now -
      simulation.modeSince
    ) /
    1000;

  if (
    simulation.mode ===
      "ACQUIRE" &&
    elapsed >
      1.2
  ) {
    setInternalMode(
      simulation,
      "TRACK",
      now,
    );
  }

  if (
    simulation.mode ===
      "PREDICT" &&
    elapsed >
      1.1
  ) {
    setInternalMode(
      simulation,
      "RENDEZVOUS",
      now,
    );
  }

  if (
    simulation.mode ===
    "RENDEZVOUS"
  ) {
    const distance =
      distanceBetween(
        simulation.leader,
        simulation.follower,
      );

    if (
      distance <=
      simulation.desiredSeparationMeters +
        45
    ) {
      setInternalMode(
        simulation,
        "SHADOW",
        now,
      );
    }
  }
}

/* =========================================================
   Sampling
   ========================================================= */

function sampleTrajectory(
  simulation:
    InternalSimulation,
  now:
    number,
) {
  if (
    now -
      simulation.lastHistorySample <
    120
  ) {
    return;
  }

  simulation.lastHistorySample =
    now;

  simulation.leaderHistory.push(
    {
      t:
        now,

      x:
        simulation.leader.x,

      y:
        simulation.leader.y,
    },
  );

  simulation.leaderHistory =
    simulation.leaderHistory.slice(
      -HISTORY_LIMIT,
    );

  simulation.leaderTrail.push(
    {
      x:
        simulation.leader.x,

      y:
        simulation.leader.y,
    },
  );

  simulation.followerTrail.push(
    {
      x:
        simulation.follower.x,

      y:
        simulation.follower.y,
    },
  );

  simulation.leaderTrail =
    simulation.leaderTrail.slice(
      -TRAIL_LIMIT,
    );

  simulation.followerTrail =
    simulation.followerTrail.slice(
      -TRAIL_LIMIT,
    );
}

/* =========================================================
   Public Snapshot
   ========================================================= */

function createSnapshot(
  simulation:
    InternalSimulation,
): InterceptSnapshot {
  const distanceMeters =
    distanceBetween(
      simulation.leader,
      simulation.follower,
    );

  const leaderVelocity =
    velocityVector(
      simulation.leader,
    );

  const followerVelocity =
    velocityVector(
      simulation.follower,
    );

  const relative = {
    x:
      simulation.leader.x -
      simulation.follower.x,

    y:
      simulation.leader.y -
      simulation.follower.y,
  };

  const relativeLength =
    Math.max(
      1,
      Math.hypot(
        relative.x,
        relative.y,
      ),
    );

  const unit = {
    x:
      relative.x /
      relativeLength,

    y:
      relative.y /
      relativeLength,
  };

  const closingRateMps =
    (
      followerVelocity.x -
      leaderVelocity.x
    ) *
      unit.x +
    (
      followerVelocity.y -
      leaderVelocity.y
    ) *
      unit.y;

  const distanceRemaining =
    Math.max(
      0,
      distanceMeters -
        simulation.desiredSeparationMeters,
    );

  const etaSeconds =
    closingRateMps >
      0.25
      ? distanceRemaining /
        closingRateMps
      : null;

  const baselineError =
    average(
      simulation.baselineErrors,
    );

  const mlError =
    average(
      simulation.mlErrors,
    );

  const improvementPercent =
    baselineError !==
        null &&
      mlError !==
        null &&
      baselineError >
        0
      ? (
          (
            baselineError -
            mlError
          ) /
          baselineError
        ) *
        100
      : null;

  return {
    running:
      simulation.running,

    mode:
      simulation.mode,

    predictorMode:
      simulation.predictorMode,

    simTimeSeconds:
      simulation.simTimeSeconds,

    leader: {
      ...simulation.leader,
    },

    follower: {
      ...simulation.follower,
    },

    leaderTrail:
      [
        ...simulation
          .leaderTrail,
      ],

    followerTrail:
      [
        ...simulation
          .followerTrail,
      ],

    baselinePath:
      [
        ...simulation
          .baselinePath,
      ],

    mlPath:
      [
        ...simulation
          .mlPath,
      ],

    guidanceTarget: {
      ...simulation
        .guidanceTarget,
    },

    home: {
      ...simulation.home,
    },

    distanceMeters,

    closingRateMps,

    relativeBearingDegrees:
      bearingBetween(
        simulation.follower,
        simulation.leader,
      ),

    etaSeconds,

    desiredSeparationMeters:
      simulation.desiredSeparationMeters,

    minimumSeparationMeters:
      simulation.minimumSeparationMeters,

    separationSafe:
      distanceMeters >=
      simulation.minimumSeparationMeters,

    ai: {
      model:
        "Online Quadratic Regression",

      confidence:
        simulation.aiConfidence,

      predictionHorizonSeconds:
        PREDICTION_HORIZON_SECONDS,

      residualMeters:
        simulation.aiResidualMeters,

      ready:
        simulation
          .leaderHistory
          .length >=
        10,
    },

    performance: {
      baselineErrorMeters:
        baselineError,

      mlErrorMeters:
        mlError,

      improvementPercent,

      validationSamples:
        Math.min(
          simulation
            .baselineErrors
            .length,

          simulation
            .mlErrors
            .length,
        ),
    },

    gamepad: {
      ...simulation.gamepad,
    },
  };
}

/* =========================================================
   Hook
   ========================================================= */

export function useInterceptSimulation() {
  const simulationRef =
    useRef<InternalSimulation>(
      createInitialSimulation(),
    );

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<InterceptSnapshot>(
      () =>
        createSnapshot(
          simulationRef.current,
        ),
    );

  const lastFrameRef =
    useRef(
      performance.now(),
    );

  const lastPublishRef =
    useRef(
      0,
    );

  const publish =
    useCallback(
      () => {
        setSnapshot(
          createSnapshot(
            simulationRef.current,
          ),
        );
      },
      [],
    );

  useEffect(
    () => {
      let frameId =
        0;

      const frame = (
        now: number,
      ) => {
        const simulation =
          simulationRef.current;

        const deltaSeconds =
          clamp(
            (
              now -
              lastFrameRef.current
            ) /
              1000,
            0,
            0.08,
          );

        lastFrameRef.current =
          now;

        if (
          simulation.running
        ) {
          simulation.simTimeSeconds +=
            deltaSeconds;

          updateLeader(
            simulation,
            deltaSeconds,
          );

          sampleTrajectory(
            simulation,
            now,
          );

          updatePredictions(
            simulation,
            now,
          );

          updateAutomaticModeTransitions(
            simulation,
            now,
          );

          updateFollower(
            simulation,
            deltaSeconds,
          );
        } else {
          const gamepad =
            getConnectedGamepad();

          simulation.gamepad =
            gamepad
              ? {
                  connected:
                    true,

                  id:
                    gamepad.id,

                  steeringAxis:
                    clamp(
                      gamepad
                        .axes[
                        0
                      ] ??
                        0,
                      -1,
                      1,
                    ),

                  speedAxis:
                    clamp(
                      -(
                        gamepad
                          .axes[
                          1
                        ] ??
                        0
                      ),
                      -1,
                      1,
                    ),
                }
              : {
                  connected:
                    false,

                  id:
                    "",

                  steeringAxis:
                    0,

                  speedAxis:
                    0,
                };
        }

        if (
          now -
            lastPublishRef.current >=
          90
        ) {
          lastPublishRef.current =
            now;

          publish();
        }

        frameId =
          requestAnimationFrame(
            frame,
          );
      };

      frameId =
        requestAnimationFrame(
          frame,
        );

      return () => {
        cancelAnimationFrame(
          frameId,
        );
      };
    },
    [
      publish,
    ],
  );

  const setMode =
    useCallback(
      (
        mode:
          InterceptMode,
      ) => {
        setInternalMode(
          simulationRef.current,
          mode,
        );

        publish();
      },
      [
        publish,
      ],
    );

  const toggleRunning =
    useCallback(
      () => {
        simulationRef.current.running =
          !simulationRef
            .current
            .running;

        lastFrameRef.current =
          performance.now();

        publish();
      },
      [
        publish,
      ],
    );

  const reset =
    useCallback(
      () => {
        simulationRef.current =
          createInitialSimulation();

        lastFrameRef.current =
          performance.now();

        publish();
      },
      [
        publish,
      ],
    );

  const setPredictorMode =
    useCallback(
      (
        predictorMode:
          PredictorMode,
      ) => {
        simulationRef.current.predictorMode =
          predictorMode;

        publish();
      },
      [
        publish,
      ],
    );

  const setDesiredSeparation =
    useCallback(
      (
        value: number,
      ) => {
        simulationRef.current.desiredSeparationMeters =
          clamp(
            value,
            110,
            300,
          );

        publish();
      },
      [
        publish,
      ],
    );

  const actions =
    useMemo(
      () => ({
        toggleRunning,

        reset,

        setPredictorMode,

        setDesiredSeparation,

        startTracking: () =>
          setMode(
            "ACQUIRE",
          ),

        startIntercept: () =>
          setMode(
            "PREDICT",
          ),

        shadow: () =>
          setMode(
            "SHADOW",
          ),

        hold: () =>
          setMode(
            "HOLD",
          ),

        abort: () =>
          setMode(
            "ABORT",
          ),

        rtl: () =>
          setMode(
            "RTL",
          ),

        idle: () =>
          setMode(
            "IDLE",
          ),
      }),
      [
        reset,
        setDesiredSeparation,
        setMode,
        setPredictorMode,
        toggleRunning,
      ],
    );

  return {
    snapshot,
    actions,
  };
}