import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

export type SpeedControlState = {
  leaderCommandedAirspeed:
    number;

  followerMaxAirspeed:
    number;

  adaptiveSync:
    boolean;

  airspeedDelta:
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

    confidence:
      number;

    predictionHorizonSeconds:
      number;

    residualMeters:
      number;

    ready:
      boolean;

    trainingSamples:
      number;
  };

  performance:
    PredictionPerformance;

  speedControl:
    SpeedControlState;

  gamepad:
    GamepadState;
};

/* =========================================================
   Internal ML structures
   ========================================================= */

type LearningModel = {
  weightsX:
    number[];

  weightsY:
    number[];

  sampleCount:
    number;

  learningRate:
    number;
};

type PendingPrediction = {
  dueAt:
    number;

  origin:
    Vector2;

  features:
    number[];

  baseline:
    Vector2;

  ml:
    Vector2;
};

type InternalSimulation = {
  running:
    boolean;

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

  leaderCommandedAirspeed:
    number;

  followerMaxAirspeed:
    number;

  adaptiveSpeedSync:
    boolean;

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

  pendingPredictions:
    PendingPrediction[];

  baselineErrors:
    number[];

  mlErrors:
    number[];

  mlModel:
    LearningModel;

  lastTrailSample:
    number;

  lastEvaluationCreated:
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
  140;

const ERROR_HISTORY_LIMIT =
  30;

const MODEL_SCALE =
  50;

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

function dot(
  weights:
    number[],

  features:
    number[],
) {
  let value =
    0;

  for (
    let index =
      0;
    index <
      weights.length;
    index +=
      1
  ) {
    value +=
      weights[
        index
      ] *
      (
        features[
          index
        ] ??
        0
      );
  }

  return value;
}

/* =========================================================
   Relative Motion
   ========================================================= */

function calculateClosingRate(
  leader:
    AircraftState,

  follower:
    AircraftState,
) {
  const leaderVelocity =
    velocityVector(
      leader,
    );

  const followerVelocity =
    velocityVector(
      follower,
    );

  const relativeX =
    leader.x -
    follower.x;

  const relativeY =
    leader.y -
    follower.y;

  const distance =
    Math.max(
      1,
      Math.hypot(
        relativeX,
        relativeY,
      ),
    );

  const unitX =
    relativeX /
    distance;

  const unitY =
    relativeY /
    distance;

  return (
    (
      followerVelocity.x -
      leaderVelocity.x
    ) *
      unitX +
    (
      followerVelocity.y -
      leaderVelocity.y
    ) *
      unitY
  );
}

/* =========================================================
   Baseline Predictor
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

/* =========================================================
   Online ML Predictor

   This is an online supervised regression model.

   Inputs:
   - current velocity
   - heading
   - turn rate
   - speed
   - prediction horizon

   Targets:
   - actual future x displacement
   - actual future y displacement

   The model starts equivalent to constant velocity and
   learns turn corrections using SGD as predictions mature.
   ========================================================= */

function createLearningModel():
  LearningModel {
  return {
    /*
     * Feature indices:
     * 0 bias
     * 1 vx * horizon
     * 2 vy * horizon
     * 3 turn curvature
     * 4 curvature projected east
     * 5 curvature projected north
     */

    weightsX: [
      0,
      1,
      0,
      0,
      0,
      0,
    ],

    weightsY: [
      0,
      0,
      1,
      0,
      0,
      0,
    ],

    sampleCount:
      0,

    learningRate:
      0.025,
  };
}

function buildFeatures(
  leader:
    AircraftState,

  horizonSeconds:
    number,
) {
  const velocity =
    velocityVector(
      leader,
    );

  const headingRadians =
    toRadians(
      leader.heading,
    );

  const turnRateRadians =
    toRadians(
      leader.turnRate,
    );

  /*
   * Arc curvature magnitude.
   * h² gives turns more influence farther into the future.
   */
  const curvature =
    (
      leader.airspeed *
      turnRateRadians *
      horizonSeconds *
      horizonSeconds
    ) /
    MODEL_SCALE;

  return [
    1,

    (
      velocity.x *
      horizonSeconds
    ) /
      MODEL_SCALE,

    (
      velocity.y *
      horizonSeconds
    ) /
      MODEL_SCALE,

    curvature,

    curvature *
      Math.cos(
        headingRadians,
      ),

    curvature *
      Math.sin(
        headingRadians,
      ),
  ];
}

function mlPrediction(
  leader:
    AircraftState,

  horizonSeconds:
    number,

  model:
    LearningModel,
): Vector2 {
  const features =
    buildFeatures(
      leader,
      horizonSeconds,
    );

  const dx =
    dot(
      model.weightsX,
      features,
    ) *
    MODEL_SCALE;

  const dy =
    dot(
      model.weightsY,
      features,
    ) *
    MODEL_SCALE;

  return {
    x:
      leader.x +
      dx,

    y:
      leader.y +
      dy,
  };
}

function trainModel(
  model:
    LearningModel,

  features:
    number[],

  targetDisplacement:
    Vector2,
) {
  const targetX =
    targetDisplacement.x /
    MODEL_SCALE;

  const targetY =
    targetDisplacement.y /
    MODEL_SCALE;

  const predictionX =
    dot(
      model.weightsX,
      features,
    );

  const predictionY =
    dot(
      model.weightsY,
      features,
    );

  const errorX =
    clamp(
      targetX -
        predictionX,
      -2.5,
      2.5,
    );

  const errorY =
    clamp(
      targetY -
        predictionY,
      -2.5,
      2.5,
    );

  features.forEach(
    (
      rawFeature,
      index,
    ) => {
      const feature =
        clamp(
          rawFeature,
          -3,
          3,
        );

      model.weightsX[
        index
      ] +=
        model.learningRate *
        errorX *
        feature;

      model.weightsY[
        index
      ] +=
        model.learningRate *
        errorY *
        feature;

      model.weightsX[
        index
      ] =
        clamp(
          model.weightsX[
            index
          ],
          -5,
          5,
        );

      model.weightsY[
        index
      ] =
        clamp(
          model.weightsY[
            index
          ],
          -5,
          5,
        );
    },
  );

  model.sampleCount +=
    1;
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

    leaderCommandedAirspeed:
      22,

    followerMaxAirspeed:
      30,

    adaptiveSpeedSync:
      true,

    leaderTrail:
      [],

    followerTrail:
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

    pendingPredictions:
      [],

    baselineErrors:
      [],

    mlErrors:
      [],

    mlModel:
      createLearningModel(),

    lastTrailSample:
      now,

    lastEvaluationCreated:
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
   Browser Controller
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
   Prediction Update
   ========================================================= */

function updatePredictions(
  simulation:
    InternalSimulation,

  now:
    number,
) {
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
    horizons.map(
      (
        horizon,
      ) =>
        mlPrediction(
          simulation.leader,
          horizon,
          simulation.mlModel,
        ),
    );

  const remaining:
    PendingPrediction[] =
    [];

  simulation.pendingPredictions.forEach(
    (
      prediction,
    ) => {
      if (
        prediction.dueAt >
        now
      ) {
        remaining.push(
          prediction,
        );

        return;
      }

      const actualPosition = {
        x:
          simulation.leader.x,

        y:
          simulation.leader.y,
      };

      const baselineError =
        distanceBetween(
          actualPosition,
          prediction.baseline,
        );

      const mlError =
        distanceBetween(
          actualPosition,
          prediction.ml,
        );

      simulation.baselineErrors.push(
        baselineError,
      );

      simulation.mlErrors.push(
        mlError,
      );

      trainModel(
        simulation.mlModel,
        prediction.features,
        {
          x:
            actualPosition.x -
            prediction.origin.x,

          y:
            actualPosition.y -
            prediction.origin.y,
        },
      );
    },
  );

  simulation.pendingPredictions =
    remaining;

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
      simulation.lastEvaluationCreated >
    700
  ) {
    simulation.lastEvaluationCreated =
      now;

    simulation.pendingPredictions.push(
      {
        dueAt:
          now +
          PREDICTION_HORIZON_SECONDS *
            1000,

        origin: {
          x:
            simulation.leader.x,

          y:
            simulation.leader.y,
        },

        features:
          buildFeatures(
            simulation.leader,
            PREDICTION_HORIZON_SECONDS,
          ),

        baseline:
          baselinePrediction(
            simulation.leader,
            PREDICTION_HORIZON_SECONDS,
          ),

        ml:
          mlPrediction(
            simulation.leader,
            PREDICTION_HORIZON_SECONDS,
            simulation.mlModel,
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

  let targetAirspeed =
    simulation.leaderCommandedAirspeed;

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

    targetAirspeed =
      simulation.leaderCommandedAirspeed +
      speedAxis *
        6;
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
            4.4,
        ) *
          6.6 +
          Math.sin(
            time /
              1.7,
          ) *
            2.3,
        -9.5,
        9.5,
      );
  }

  targetAirspeed =
    clamp(
      targetAirspeed,
      14,
      34,
    );

  simulation.leader.airspeed +=
    (
      targetAirspeed -
      simulation.leader
        .airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.8,
    );

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
        3.2,
      -38,
      38,
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
   Guidance
   ========================================================= */

function calculateGuidanceTarget(
  simulation:
    InternalSimulation,
): Vector2 {
  const selectedPath =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath
      : simulation.baselinePath;

  const predictedPosition =
    selectedPath[
      3
    ] ??
    simulation.leader;

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

  let desiredDistance =
    simulation.desiredSeparationMeters;

  if (
    simulation.mode ===
      "ACQUIRE" ||
    simulation.mode ===
      "TRACK"
  ) {
    desiredDistance +=
      35;
  }

  if (
    simulation.mode ===
    "RENDEZVOUS"
  ) {
    desiredDistance =
      Math.max(
        simulation.minimumSeparationMeters +
          35,

        simulation.desiredSeparationMeters -
          15,
      );
  }

  const futureVector =
    headingVector(
      futureHeading,
    );

  return {
    x:
      predictedPosition.x -
      futureVector.x *
        desiredDistance,

    y:
      predictedPosition.y -
      futureVector.y *
        desiredDistance,
  };
}

/* =========================================================
   Follower Dynamics + Speed Controller
   ========================================================= */

function updateFollower(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  const leader =
    simulation.leader;

  const follower =
    simulation.follower;

  const separation =
    distanceBetween(
      follower,
      leader,
    );

  const closingRate =
    calculateClosingRate(
      leader,
      follower,
    );

  let target: Vector2 = {
    x:
      follower.x,

    y:
      follower.y,
  };

  let targetSpeed =
    leader.airspeed;

  let maxTurnRate =
    9.5;

  if (
    simulation.mode ===
    "IDLE"
  ) {
    follower.mode =
      "STANDBY";

    follower.turnRate =
      0;

    targetSpeed =
      Math.min(
        leader.airspeed,
        19,
      );
  } else if (
    simulation.mode ===
    "HOLD"
  ) {
    follower.mode =
      "LOITER";

    follower.turnRate =
      5.2;

    targetSpeed =
      Math.min(
        20,
        simulation.followerMaxAirspeed,
      );
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
      Math.min(
        simulation.followerMaxAirspeed,
        25,
      );

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
      Math.min(
        simulation.followerMaxAirspeed,
        22,
      );

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

    /*
     * Adaptive speed controller.
     *
     * Distance error asks for more/less speed.
     * Closing-rate damping prevents overshoot.
     */
    if (
      simulation.adaptiveSpeedSync
    ) {
      const distanceCorrection =
        separationError *
        0.032;

      const closingCorrection =
        closingRate *
        0.55;

      targetSpeed =
        leader.airspeed +
        clamp(
          distanceCorrection -
            closingCorrection,
          -4.5,
          8.5,
        );
    } else {
      targetSpeed =
        leader.airspeed +
        clamp(
          separationError *
            0.02,
          -3,
          6,
        );
    }
  }

  /*
   * Hard protected-distance recovery.
   */
  if (
    separation <
      simulation.minimumSeparationMeters &&
    simulation.mode !==
      "ABORT" &&
    simulation.mode !==
      "RTL"
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
          320,

      y:
        follower.y +
        awayVector.y *
          320,
    };

    targetSpeed =
      Math.max(
        15,
        leader.airspeed -
          5,
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
        3.25,
      -40,
      40,
    );

  targetSpeed =
    clamp(
      targetSpeed,
      14,
      simulation.followerMaxAirspeed,
    );

  follower.airspeed +=
    (
      targetSpeed -
      follower.airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.7,
    );

  follower.altitude +=
    clamp(
      leader.altitude -
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
      1
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
        40
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
   Trails
   ========================================================= */

function sampleTrails(
  simulation:
    InternalSimulation,

  now:
    number,
) {
  if (
    now -
      simulation.lastTrailSample <
    150
  ) {
    return;
  }

  simulation.lastTrailSample =
    now;

  simulation.leaderTrail.push({
    x:
      simulation.leader.x,

    y:
      simulation.leader.y,
  });

  simulation.followerTrail.push({
    x:
      simulation.follower.x,

    y:
      simulation.follower.y,
  });

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
   Snapshot
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

  const closingRateMps =
    calculateClosingRate(
      simulation.leader,
      simulation.follower,
    );

  const remainingDistance =
    Math.max(
      0,
      distanceMeters -
        simulation.desiredSeparationMeters,
    );

  const etaSeconds =
    closingRateMps >
      0.25
      ? remainingDistance /
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

  const trainingSamples =
    simulation.mlModel
      .sampleCount;

  const residualMeters =
    mlError ??
    0;

  const sampleConfidence =
    clamp(
      trainingSamples /
        18,
      0,
      1,
    );

  const errorConfidence =
    mlError ===
    null
      ? 0.35
      : clamp(
          1 -
            mlError /
              100,
          0.25,
          1,
        );

  const confidence =
    clamp(
      0.3 +
        sampleConfidence *
          0.35 +
        errorConfidence *
          0.35,
      0.3,
      0.97,
    );

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

    leaderTrail: [
      ...simulation.leaderTrail,
    ],

    followerTrail: [
      ...simulation.followerTrail,
    ],

    baselinePath: [
      ...simulation.baselinePath,
    ],

    mlPath: [
      ...simulation.mlPath,
    ],

    guidanceTarget: {
      ...simulation.guidanceTarget,
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
        "Online SGD Trajectory Regressor",

      confidence,

      predictionHorizonSeconds:
        PREDICTION_HORIZON_SECONDS,

      residualMeters,

      ready:
        trainingSamples >=
        5,

      trainingSamples,
    },

    performance: {
      baselineErrorMeters:
        baselineError,

      mlErrorMeters:
        mlError,

      improvementPercent,

      validationSamples:
        Math.min(
          simulation.baselineErrors.length,
          simulation.mlErrors.length,
        ),
    },

    speedControl: {
      leaderCommandedAirspeed:
        simulation.leaderCommandedAirspeed,

      followerMaxAirspeed:
        simulation.followerMaxAirspeed,

      adaptiveSync:
        simulation.adaptiveSpeedSync,

      airspeedDelta:
        simulation.follower.airspeed -
        simulation.leader.airspeed,
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
        now:
          number,
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

          sampleTrails(
            simulation,
            now,
          );
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
        value:
          number,
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

  const setLeaderCommandedAirspeed =
    useCallback(
      (
        value:
          number,
      ) => {
        simulationRef.current.leaderCommandedAirspeed =
          clamp(
            value,
            14,
            34,
          );

        publish();
      },
      [
        publish,
      ],
    );

  const setFollowerMaxAirspeed =
    useCallback(
      (
        value:
          number,
      ) => {
        simulationRef.current.followerMaxAirspeed =
          clamp(
            value,
            18,
            38,
          );

        publish();
      },
      [
        publish,
      ],
    );

  const setAdaptiveSpeedSync =
    useCallback(
      (
        enabled:
          boolean,
      ) => {
        simulationRef.current.adaptiveSpeedSync =
          enabled;

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

        setLeaderCommandedAirspeed,

        setFollowerMaxAirspeed,

        setAdaptiveSpeedSync,

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
        setAdaptiveSpeedSync,
        setDesiredSeparation,
        setFollowerMaxAirspeed,
        setLeaderCommandedAirspeed,
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