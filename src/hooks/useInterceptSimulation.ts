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

  ctrvErrorMeters:
    number | null;

  learnedErrorMeters:
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

  followerCommandedAirspeed:
    number;

  followerMaxAirspeed:
    number;

  adaptiveSync:
    boolean;

  airspeedDelta:
    number;
};

export type PredictorWeights = {
  cv: number;
  ctrv: number;
  learned: number;
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

  ctrvPath:
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

  predictedClosestSeparationMeters:
    number;

  anticipatorySafetyGate:
    boolean;

  ai: {
    model: string;

    selectedPredictor:
      "CV"
      | "CTRV"
      | "ADAPTIVE";

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

    weights:
      PredictorWeights;
  };

  performance:
    PredictionPerformance;

  speedControl:
    SpeedControlState;

  gamepad:
    GamepadState;
};

/* =========================================================
   Internal Types
   ========================================================= */

type ResidualModel = {
  weightsX:
    number[];

  weightsY:
    number[];

  sampleCount:
    number;

  learningRate:
    number;
};

type PredictorErrorHistory = {
  cv:
    number[];

  ctrv:
    number[];

  learned:
    number[];

  adaptive:
    number[];
};

type PendingPrediction = {
  dueAt:
    number;

  origin:
    Vector2;

  features:
    number[];

  cv:
    Vector2;

  ctrv:
    Vector2;

  learned:
    Vector2;

  adaptive:
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

  followerCommandedAirspeed:
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

  ctrvPath:
    Vector2[];

  learnedPath:
    Vector2[];

  mlPath:
    Vector2[];

  guidanceTarget:
    Vector2;

  pendingPredictions:
    PendingPrediction[];

  errors:
    PredictorErrorHistory;

  residualModel:
    ResidualModel;

  lastTrailSample:
    number;

  lastPredictionSample:
    number;

  gamepad:
    GamepadState;
};

/* =========================================================
   Constants
   ========================================================= */

const PREDICTION_HORIZON_SECONDS =
  3;

const PREDICTION_INTERVAL_MS =
  700;

const TRAIL_INTERVAL_MS =
  160;

const TRAIL_LIMIT =
  150;

const ERROR_HISTORY_LIMIT =
  36;

const RESIDUAL_SCALE_METERS =
  60;

const PREDICTION_HORIZONS = [
  0.75,
  1.5,
  2.25,
  3,
  3.75,
  4.5,
];

/* =========================================================
   General Math
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
  weights: number[],
  features: number[],
) {
  let result =
    0;

  for (
    let index =
      0;
    index <
      weights.length;
    index +=
      1
  ) {
    result +=
      (
        weights[
          index
        ] ??
        0
      ) *
      (
        features[
          index
        ] ??
        0
      );
  }

  return result;
}

function weightedPoint(
  cv:
    Vector2,

  ctrv:
    Vector2,

  learned:
    Vector2,

  weights:
    PredictorWeights,
): Vector2 {
  return {
    x:
      cv.x *
        weights.cv +
      ctrv.x *
        weights.ctrv +
      learned.x *
        weights.learned,

    y:
      cv.y *
        weights.cv +
      ctrv.y *
        weights.ctrv +
      learned.y *
        weights.learned,
  };
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

function predictClosestApproach(
  leader:
    AircraftState,

  follower:
    AircraftState,

  horizonSeconds =
    5,
) {
  const leaderVelocity =
    velocityVector(
      leader,
    );

  const followerVelocity =
    velocityVector(
      follower,
    );

  const relativePosition = {
    x:
      leader.x -
      follower.x,

    y:
      leader.y -
      follower.y,
  };

  const relativeVelocity = {
    x:
      leaderVelocity.x -
      followerVelocity.x,

    y:
      leaderVelocity.y -
      followerVelocity.y,
  };

  const velocitySquared =
    relativeVelocity.x *
      relativeVelocity.x +
    relativeVelocity.y *
      relativeVelocity.y;

  if (
    velocitySquared <
    0.0001
  ) {
    return distanceBetween(
      leader,
      follower,
    );
  }

  const timeToClosest =
    clamp(
      -(
        relativePosition.x *
          relativeVelocity.x +
        relativePosition.y *
          relativeVelocity.y
      ) /
        velocitySquared,
      0,
      horizonSeconds,
    );

  const futureRelative = {
    x:
      relativePosition.x +
      relativeVelocity.x *
        timeToClosest,

    y:
      relativePosition.y +
      relativeVelocity.y *
        timeToClosest,
  };

  return Math.hypot(
    futureRelative.x,
    futureRelative.y,
  );
}

/* =========================================================
   Predictor 1: Constant Velocity
   ========================================================= */

function constantVelocityPrediction(
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
   Predictor 2: CTRV
   Constant Turn Rate + Velocity

   Heading convention:
   0° north, 90° east.
   ========================================================= */

function ctrvPrediction(
  leader:
    AircraftState,

  secondsAhead:
    number,
): Vector2 {
  const heading =
    toRadians(
      leader.heading,
    );

  const turnRate =
    toRadians(
      leader.turnRate,
    );

  if (
    Math.abs(
      turnRate,
    ) <
    0.0008
  ) {
    return constantVelocityPrediction(
      leader,
      secondsAhead,
    );
  }

  const futureHeading =
    heading +
    turnRate *
      secondsAhead;

  const x =
    leader.x +
    (
      leader.airspeed /
      turnRate
    ) *
      (
        Math.cos(
          heading,
        ) -
        Math.cos(
          futureHeading,
        )
      );

  const y =
    leader.y +
    (
      leader.airspeed /
      turnRate
    ) *
      (
        Math.sin(
          futureHeading,
        ) -
        Math.sin(
          heading,
        )
      );

  return {
    x,
    y,
  };
}

/* =========================================================
   Predictor 3: Online Residual Learner

   Learns the residual error remaining after CTRV.
   This means physics handles most motion and ML only learns
   corrections rather than trying to learn flight from zero.
   ========================================================= */

function createResidualModel():
  ResidualModel {
  return {
    weightsX: [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],

    weightsY: [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],

    sampleCount:
      0,

    learningRate:
      0.012,
  };
}

function buildResidualFeatures(
  leader:
    AircraftState,

  horizonSeconds:
    number,
) {
  const heading =
    toRadians(
      leader.heading,
    );

  return [
    1,

    clamp(
      leader.turnRate /
        10,
      -1.5,
      1.5,
    ),

    clamp(
      leader.bank /
        40,
      -1.5,
      1.5,
    ),

    clamp(
      (
        leader.airspeed -
        22
      ) /
        12,
      -1.5,
      1.5,
    ),

    Math.sin(
      heading,
    ),

    Math.cos(
      heading,
    ),

    clamp(
      horizonSeconds /
        4.5,
      0,
      1.5,
    ),
  ];
}

function learnedPrediction(
  leader:
    AircraftState,

  horizonSeconds:
    number,

  model:
    ResidualModel,
): Vector2 {
  const physicsPrediction =
    ctrvPrediction(
      leader,
      horizonSeconds,
    );

  const features =
    buildResidualFeatures(
      leader,
      horizonSeconds,
    );

  const correctionX =
    dot(
      model.weightsX,
      features,
    ) *
    RESIDUAL_SCALE_METERS;

  const correctionY =
    dot(
      model.weightsY,
      features,
    ) *
    RESIDUAL_SCALE_METERS;

  return {
    x:
      physicsPrediction.x +
      correctionX,

    y:
      physicsPrediction.y +
      correctionY,
  };
}

function trainResidualModel(
  model:
    ResidualModel,

  features:
    number[],

  ctrvPredictionPoint:
    Vector2,

  actualPosition:
    Vector2,
) {
  const targetResidualX =
    (
      actualPosition.x -
      ctrvPredictionPoint.x
    ) /
    RESIDUAL_SCALE_METERS;

  const targetResidualY =
    (
      actualPosition.y -
      ctrvPredictionPoint.y
    ) /
    RESIDUAL_SCALE_METERS;

  const predictedResidualX =
    dot(
      model.weightsX,
      features,
    );

  const predictedResidualY =
    dot(
      model.weightsY,
      features,
    );

  const errorX =
    clamp(
      targetResidualX -
        predictedResidualX,
      -1.5,
      1.5,
    );

  const errorY =
    clamp(
      targetResidualY -
        predictedResidualY,
      -1.5,
      1.5,
    );

  features.forEach(
    (
      rawFeature,
      index,
    ) => {
      const feature =
        clamp(
          rawFeature,
          -1.5,
          1.5,
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
          -1.5,
          1.5,
        );

      model.weightsY[
        index
      ] =
        clamp(
          model.weightsY[
            index
          ],
          -1.5,
          1.5,
        );
    },
  );

  model.sampleCount +=
    1;
}

/* =========================================================
   Adaptive Ensemble
   ========================================================= */

function calculatePredictorWeights(
  errors:
    PredictorErrorHistory,
): PredictorWeights {
  const cvError =
    average(
      errors.cv,
    );

  const ctrvError =
    average(
      errors.ctrv,
    );

  const learnedError =
    average(
      errors.learned,
    );

  /*
   * Initial weighting before enough validation:
   * favor CTRV because this mission specifically needs
   * improved turn prediction.
   */
  if (
    cvError ===
      null ||
    ctrvError ===
      null ||
    learnedError ===
      null
  ) {
    return {
      cv:
        0.15,

      ctrv:
        0.5,

      learned:
        0.35,
    };
  }

  /*
   * Inverse-error weighting.
   * A poor model automatically loses authority.
   */
  const inverseCv =
    1 /
    Math.max(
      2,
      cvError,
    );

  const inverseCtrv =
    1 /
    Math.max(
      2,
      ctrvError,
    );

  const inverseLearned =
    1 /
    Math.max(
      2,
      learnedError,
    );

  const total =
    inverseCv +
    inverseCtrv +
    inverseLearned;

  return {
    cv:
      inverseCv /
      total,

    ctrv:
      inverseCtrv /
      total,

    learned:
      inverseLearned /
      total,
  };
}

function adaptivePrediction(
  leader:
    AircraftState,

  horizonSeconds:
    number,

  model:
    ResidualModel,

  errors:
    PredictorErrorHistory,
): Vector2 {
  const cv =
    constantVelocityPrediction(
      leader,
      horizonSeconds,
    );

  const ctrv =
    ctrvPrediction(
      leader,
      horizonSeconds,
    );

  const learned =
    learnedPrediction(
      leader,
      horizonSeconds,
      model,
    );

  return weightedPoint(
    cv,
    ctrv,
    learned,
    calculatePredictorWeights(
      errors,
    ),
  );
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
        220,

      y:
        100,

      heading:
        38,

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
        -460,

      y:
        -290,

      heading:
        40,

      airspeed:
        21,

      altitude:
        114,

      turnRate:
        0,

      bank:
        0,

      mode:
        "STANDBY",
    },

    home: {
      x:
        -460,

      y:
        -290,
    },

    desiredSeparationMeters:
      160,

    minimumSeparationMeters:
      80,

    leaderCommandedAirspeed:
      22,

    followerCommandedAirspeed:
      21,

    followerMaxAirspeed:
      32,

    adaptiveSpeedSync:
      true,

    leaderTrail:
      [],

    followerTrail:
      [],

    baselinePath:
      [],

    ctrvPath:
      [],

    learnedPath:
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

    errors: {
      cv:
        [],

      ctrv:
        [],

      learned:
        [],

      adaptive:
        [],
    },

    residualModel:
      createResidualModel(),

    lastTrailSample:
      now,

    lastPredictionSample:
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
   Browser Gamepad
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
        7;
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

    /*
     * Intentional changing-turn profile:
     * useful for comparing CV against turn-aware prediction.
     */
    simulation.leader.turnRate =
      clamp(
        Math.sin(
          time /
            4.8,
        ) *
          6.5 +
          Math.sin(
            time /
              1.85,
          ) *
            2.1,
        -9,
        9,
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
        1.6,
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
   Prediction Engine
   ========================================================= */

function updatePredictionPaths(
  simulation:
    InternalSimulation,
) {
  simulation.baselinePath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        constantVelocityPrediction(
          simulation.leader,
          horizon,
        ),
    );

  simulation.ctrvPath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        ctrvPrediction(
          simulation.leader,
          horizon,
        ),
    );

  simulation.learnedPath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        learnedPrediction(
          simulation.leader,
          horizon,
          simulation.residualModel,
        ),
    );

  simulation.mlPath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        adaptivePrediction(
          simulation.leader,
          horizon,
          simulation.residualModel,
          simulation.errors,
        ),
    );
}

function trimErrors(
  values:
    number[],
) {
  return values.slice(
    -ERROR_HISTORY_LIMIT,
  );
}

function evaluatePredictions(
  simulation:
    InternalSimulation,

  now:
    number,
) {
  const remaining:
    PendingPrediction[] =
    [];

  simulation.pendingPredictions.forEach(
    (
      pending,
    ) => {
      if (
        pending.dueAt >
        now
      ) {
        remaining.push(
          pending,
        );

        return;
      }

      const actualPosition = {
        x:
          simulation.leader.x,

        y:
          simulation.leader.y,
      };

      simulation.errors.cv.push(
        distanceBetween(
          actualPosition,
          pending.cv,
        ),
      );

      simulation.errors.ctrv.push(
        distanceBetween(
          actualPosition,
          pending.ctrv,
        ),
      );

      simulation.errors.learned.push(
        distanceBetween(
          actualPosition,
          pending.learned,
        ),
      );

      simulation.errors.adaptive.push(
        distanceBetween(
          actualPosition,
          pending.adaptive,
        ),
      );

      trainResidualModel(
        simulation.residualModel,
        pending.features,
        pending.ctrv,
        actualPosition,
      );
    },
  );

  simulation.pendingPredictions =
    remaining;

  simulation.errors.cv =
    trimErrors(
      simulation.errors.cv,
    );

  simulation.errors.ctrv =
    trimErrors(
      simulation.errors.ctrv,
    );

  simulation.errors.learned =
    trimErrors(
      simulation.errors.learned,
    );

  simulation.errors.adaptive =
    trimErrors(
      simulation.errors.adaptive,
    );
}

function queuePredictionEvaluation(
  simulation:
    InternalSimulation,

  now:
    number,
) {
  if (
    now -
      simulation.lastPredictionSample <
    PREDICTION_INTERVAL_MS
  ) {
    return;
  }

  simulation.lastPredictionSample =
    now;

  const weights =
    calculatePredictorWeights(
      simulation.errors,
    );

  const cv =
    constantVelocityPrediction(
      simulation.leader,
      PREDICTION_HORIZON_SECONDS,
    );

  const ctrv =
    ctrvPrediction(
      simulation.leader,
      PREDICTION_HORIZON_SECONDS,
    );

  const learned =
    learnedPrediction(
      simulation.leader,
      PREDICTION_HORIZON_SECONDS,
      simulation.residualModel,
    );

  const adaptive =
    weightedPoint(
      cv,
      ctrv,
      learned,
      weights,
    );

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
        buildResidualFeatures(
          simulation.leader,
          PREDICTION_HORIZON_SECONDS,
        ),

      cv,

      ctrv,

      learned,

      adaptive,
    },
  );
}

function updatePredictionEngine(
  simulation:
    InternalSimulation,

  now:
    number,
) {
  evaluatePredictions(
    simulation,
    now,
  );

  updatePredictionPaths(
    simulation,
  );

  queuePredictionEvaluation(
    simulation,
    now,
  );
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

  let predictedHeading =
    simulation.leader
      .heading;

  if (
    selectedPath.length >=
    2
  ) {
    predictedHeading =
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
      40;
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

  const direction =
    headingVector(
      predictedHeading,
    );

  return {
    x:
      predictedPosition.x -
      direction.x *
        desiredDistance,

    y:
      predictedPosition.y -
      direction.y *
        desiredDistance,
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

  const closestApproach =
    predictClosestApproach(
      leader,
      follower,
    );

  const safetyGateActive =
    closestApproach <
    simulation.minimumSeparationMeters +
      12;

  let target: Vector2 = {
    x:
      follower.x,

    y:
      follower.y,
  };

  let targetSpeed =
    leader.airspeed;

  let maximumTurnRate =
    9.5;

  if (
    simulation.mode ===
    "IDLE"
  ) {
    follower.mode =
      "STANDBY";

    /*
     * Fixed-wing standby behaves as a gentle loiter rather
     * than magically stopping in the air.
     */
    follower.turnRate =
      4;

    targetSpeed =
      Math.min(
        simulation.followerMaxAirspeed,
        18,
      );
  } else if (
    simulation.mode ===
    "HOLD"
  ) {
    follower.mode =
      "LOITER";

    follower.turnRate =
      5;

    targetSpeed =
      Math.min(
        simulation.followerMaxAirspeed,
        20,
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

    const awayDirection =
      headingVector(
        awayHeading,
      );

    target = {
      x:
        follower.x +
        awayDirection.x *
          450,

      y:
        follower.y +
        awayDirection.y *
          450,
    };

    targetSpeed =
      Math.min(
        simulation.followerMaxAirspeed,
        25,
      );

    maximumTurnRate =
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

    maximumTurnRate =
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

    const desiredHeading =
      bearingBetween(
        follower,
        target,
      );

    const headingError =
      Math.abs(
        normalizeSignedAngle(
          desiredHeading -
          follower.heading,
        ),
      );

    const turnDemand =
      clamp(
        headingError /
          90,
        0,
        1,
      );

    if (
      simulation.adaptiveSpeedSync
    ) {
      /*
       * Catch-up speed is based on:
       * - separation error
       * - current closing rate
       * - expected turn demand
       *
       * This avoids maximum-speed overshoot during turns.
       */
      const distanceCorrection =
        clamp(
          separationError *
            0.028,
          -4,
          8,
        );

      const closingDamping =
        clamp(
          closingRate *
            0.48,
          -3,
          4,
        );

      const turnPenalty =
        turnDemand *
        2.8;

      targetSpeed =
        leader.airspeed +
        distanceCorrection -
        closingDamping -
        turnPenalty;
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
   * Anticipatory safety gate.
   *
   * It reacts before the follower has already violated the
   * protected radius.
   */
  if (
    safetyGateActive &&
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

    const awayDirection =
      headingVector(
        awayHeading,
      );

    target = {
      x:
        follower.x +
        awayDirection.x *
          340,

      y:
        follower.y +
        awayDirection.y *
          340,
    };

    targetSpeed =
      Math.max(
        14,
        leader.airspeed -
          4.5,
      );

    maximumTurnRate =
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
        -maximumTurnRate,
        maximumTurnRate,
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
      -40,
      40,
    );

  targetSpeed =
    clamp(
      targetSpeed,
      14,
      simulation.followerMaxAirspeed,
    );

  simulation.followerCommandedAirspeed =
    targetSpeed;

  follower.airspeed +=
    (
      targetSpeed -
      follower.airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.65,
    );

  follower.altitude +=
    clamp(
      leader.altitude -
        follower.altitude,
      -2.5,
      2.5,
    ) *
    deltaSeconds;

  const followerVelocity =
    velocityVector(
      follower,
    );

  follower.x +=
    followerVelocity.x *
    deltaSeconds;

  follower.y +=
    followerVelocity.y *
    deltaSeconds;
}

/* =========================================================
   Mission State
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
  const elapsedSeconds =
    (
      now -
      simulation.modeSince
    ) /
    1000;

  if (
    simulation.mode ===
      "ACQUIRE" &&
    elapsedSeconds >
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
    elapsedSeconds >
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
    TRAIL_INTERVAL_MS
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

  const predictedClosestSeparationMeters =
    predictClosestApproach(
      simulation.leader,
      simulation.follower,
    );

  const anticipatorySafetyGate =
    predictedClosestSeparationMeters <
    simulation.minimumSeparationMeters +
      12;

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
      simulation.errors.cv,
    );

  const ctrvError =
    average(
      simulation.errors.ctrv,
    );

  const learnedError =
    average(
      simulation.errors.learned,
    );

  const adaptiveError =
    average(
      simulation.errors.adaptive,
    );

  const improvementPercent =
    baselineError !==
        null &&
      adaptiveError !==
        null &&
      baselineError >
        0
      ? (
          (
            baselineError -
            adaptiveError
          ) /
          baselineError
        ) *
        100
      : null;

  const weights =
    calculatePredictorWeights(
      simulation.errors,
    );

  const largestWeight =
    Math.max(
      weights.cv,
      weights.ctrv,
      weights.learned,
    );

  const selectedPredictor:
    "CV" |
    "CTRV" |
    "ADAPTIVE" =
    largestWeight ===
    weights.cv
      ? "CV"
      : largestWeight ===
          weights.ctrv
        ? "CTRV"
        : "ADAPTIVE";

  const validationSamples =
    simulation.errors.adaptive
      .length;

  const sampleConfidence =
    clamp(
      validationSamples /
        18,
      0,
      1,
    );

  const qualityConfidence =
    adaptiveError ===
    null
      ? 0.4
      : clamp(
          1 -
            adaptiveError /
              100,
          0.25,
          1,
        );

  const confidence =
    clamp(
      0.4 +
        sampleConfidence *
          0.3 +
        qualityConfidence *
          0.3,
      0.4,
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

    ctrvPath: [
      ...simulation.ctrvPath,
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

    predictedClosestSeparationMeters,

    anticipatorySafetyGate,

    ai: {
      model:
        "Adaptive CV / CTRV / Residual Ensemble",

      selectedPredictor,

      confidence,

      predictionHorizonSeconds:
        PREDICTION_HORIZON_SECONDS,

      residualMeters:
        adaptiveError ??
        0,

      ready:
        validationSamples >=
        5,

      trainingSamples:
        simulation.residualModel
          .sampleCount,

      weights,
    },

    performance: {
      baselineErrorMeters:
        baselineError,

      ctrvErrorMeters:
        ctrvError,

      learnedErrorMeters:
        learnedError,

      mlErrorMeters:
        adaptiveError,

      improvementPercent,

      validationSamples,
    },

    speedControl: {
      leaderCommandedAirspeed:
        simulation.leaderCommandedAirspeed,

      followerCommandedAirspeed:
        simulation.followerCommandedAirspeed,

      followerMaxAirspeed:
        simulation.followerMaxAirspeed,

      adaptiveSync:
        simulation.adaptiveSpeedSync,

      airspeedDelta:
        simulation.follower
          .airspeed -
        simulation.leader
          .airspeed,
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

          updatePredictionEngine(
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
          !simulationRef.current.running;

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