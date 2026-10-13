import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   Public Types
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

export type InterceptorStatus =
  | "READY"
  | "PATROL"
  | "DISPATCHED"
  | "SHADOW"
  | "RECOVERY"
  | "HOLD"
  | "RTL";

export type InterceptorState =
  AircraftState & {
    stationId: string;
    sectorId: string;
    status: InterceptorStatus;
    speedLimitMps: number;
    targetAirspeed: number;
    assigned: boolean;
  };

export type DefenseSector = {
  id: string;
  label: string;
  color: string;
  center: Vector2;
  station: Vector2;
  radiusMeters: number;
  interceptorId: number;
  active: boolean;
};

export type GamepadState = {
  connected: boolean;
  id: string;
  steeringAxis: number;
  speedAxis: number;
};

export type PredictorWeights = {
  cv: number;
  ctrv: number;
  learned: number;
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
  intruderCommandedAirspeed:
    number;

  adaptiveSync:
    boolean;
};

export type InterceptSnapshot = {
  running: boolean;

  mode:
    InterceptMode;

  predictorMode:
    PredictorMode;

  simTimeSeconds:
    number;

  intruder:
    AircraftState;

  interceptors:
    InterceptorState[];

  sectors:
    DefenseSector[];

  activeSectorId:
    string | null;

  assignedInterceptorId:
    number | null;

  autoDefenseEnabled:
    boolean;

  intruderTrail:
    Vector2[];

  interceptorTrails:
    Record<
      number,
      Vector2[]
    >;

  baselinePath:
    Vector2[];

  ctrvPath:
    Vector2[];

  mlPath:
    Vector2[];

  guidanceTarget:
    Vector2;

  distanceMeters:
    number | null;

  closingRateMps:
    number | null;

  etaSeconds:
    number | null;

  desiredSeparationMeters:
    number;

  minimumSeparationMeters:
    number;

  separationSafe:
    boolean;

  predictedClosestSeparationMeters:
    number | null;

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
  weightsX: number[];
  weightsY: number[];
  sampleCount: number;
  learningRate: number;
};

type PredictorErrorHistory = {
  cv: number[];
  ctrv: number[];
  learned: number[];
  adaptive: number[];
};

type PendingPrediction = {
  dueAt: number;

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

type InternalInterceptor =
  InterceptorState & {
    patrolPhase:
      number;
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

  intruder:
    AircraftState;

  interceptors:
    InternalInterceptor[];

  activeSectorId:
    string | null;

  assignedInterceptorId:
    number | null;

  manualDispatchInterceptorId:
    number | null;

  autoDefenseEnabled:
    boolean;

  intruderCommandedAirspeed:
    number;

  adaptiveSpeedSync:
    boolean;

  desiredSeparationMeters:
    number;

  minimumSeparationMeters:
    number;

  intruderTrail:
    Vector2[];

  interceptorTrails:
    Record<
      number,
      Vector2[]
    >;

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

  intruderTurnAcceleration:
    number;

  previousIntruderTurnRate:
    number;

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
  180;

const ERROR_HISTORY_LIMIT =
  40;

const RESIDUAL_SCALE_METERS =
  70;

/*
 * Fictional demonstration sectors.
 *
 * They are local ENU offsets around the map origin and do
 * NOT represent real defence installations.
 */
const DEFENSE_SECTOR_DEFINITIONS = [
  {
    id:
      "sector-alpha",

    label:
      "ALPHA",

    color:
      "#00E5FF",

    center: {
      x:
        -650,

      y:
        520,
    },

    station: {
      x:
        -1030,

      y:
        820,
    },

    radiusMeters:
      430,

    interceptorId:
      1,
  },

  {
    id:
      "sector-bravo",

    label:
      "BRAVO",

    color:
      "#B67CFF",

    center: {
      x:
        650,

      y:
        520,
    },

    station: {
      x:
        1030,

      y:
        820,
    },

    radiusMeters:
      430,

    interceptorId:
      2,
  },

  {
    id:
      "sector-charlie",

    label:
      "CHARLIE",

    color:
      "#FFB84D",

    center: {
      x:
        -650,

      y:
        -520,
    },

    station: {
      x:
        -1030,

      y:
        -820,
    },

    radiusMeters:
      430,

    interceptorId:
      3,
  },

  {
    id:
      "sector-delta",

    label:
      "DELTA",

    color:
      "#66FF99",

    center: {
      x:
        650,

      y:
        -520,
    },

    station: {
      x:
        1030,

      y:
        -820,
    },

    radiusMeters:
      430,

    interceptorId:
      4,
  },
] as const;

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
  first:
    Vector2,

  second:
    Vector2,
) {
  return Math.hypot(
    second.x -
      first.x,

    second.y -
      first.y,
  );
}

function bearingBetween(
  from:
    Vector2,

  to:
    Vector2,
) {
  const east =
    to.x -
    from.x;

  const north =
    to.y -
    from.y;

  return normalizeHeading(
    toDegrees(
      Math.atan2(
        east,
        north,
      ),
    ),
  );
}

function average(
  values:
    number[],
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
        sum,
        value,
      ) =>
        sum +
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
  let output =
    0;

  for (
    let index =
      0;
    index <
      weights.length;
    index +=
      1
  ) {
    output +=
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

  return output;
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
  target:
    AircraftState,

  interceptor:
    AircraftState,
) {
  const targetVelocity =
    velocityVector(
      target,
    );

  const interceptorVelocity =
    velocityVector(
      interceptor,
    );

  const relativePosition = {
    x:
      target.x -
      interceptor.x,

    y:
      target.y -
      interceptor.y,
  };

  const distance =
    Math.max(
      1,
      Math.hypot(
        relativePosition.x,
        relativePosition.y,
      ),
    );

  const unitX =
    relativePosition.x /
    distance;

  const unitY =
    relativePosition.y /
    distance;

  return (
    (
      interceptorVelocity.x -
      targetVelocity.x
    ) *
      unitX +
    (
      interceptorVelocity.y -
      targetVelocity.y
    ) *
      unitY
  );
}

function predictClosestApproach(
  target:
    AircraftState,

  interceptor:
    AircraftState,

  horizonSeconds =
    6,
) {
  const targetVelocity =
    velocityVector(
      target,
    );

  const interceptorVelocity =
    velocityVector(
      interceptor,
    );

  const relativePosition = {
    x:
      target.x -
      interceptor.x,

    y:
      target.y -
      interceptor.y,
  };

  const relativeVelocity = {
    x:
      targetVelocity.x -
      interceptorVelocity.x,

    y:
      targetVelocity.y -
      interceptorVelocity.y,
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
      target,
      interceptor,
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

  return Math.hypot(
    relativePosition.x +
      relativeVelocity.x *
        timeToClosest,

    relativePosition.y +
      relativeVelocity.y *
        timeToClosest,
  );
}

/* =========================================================
   Predictor 1 — Constant Velocity
   ========================================================= */

function constantVelocityPrediction(
  target:
    AircraftState,

  secondsAhead:
    number,
): Vector2 {
  const velocity =
    velocityVector(
      target,
    );

  return {
    x:
      target.x +
      velocity.x *
        secondsAhead,

    y:
      target.y +
      velocity.y *
        secondsAhead,
  };
}

/* =========================================================
   Predictor 2 — CTRV
   Constant Turn Rate and Velocity
   ========================================================= */

function ctrvPrediction(
  target:
    AircraftState,

  secondsAhead:
    number,
): Vector2 {
  const heading =
    toRadians(
      target.heading,
    );

  const turnRate =
    toRadians(
      target.turnRate,
    );

  if (
    Math.abs(
      turnRate,
    ) <
    0.0008
  ) {
    return constantVelocityPrediction(
      target,
      secondsAhead,
    );
  }

  const futureHeading =
    heading +
    turnRate *
      secondsAhead;

  return {
    x:
      target.x +
      (
        target.airspeed /
        turnRate
      ) *
        (
          Math.cos(
            heading,
          ) -
          Math.cos(
            futureHeading,
          )
        ),

    y:
      target.y +
      (
        target.airspeed /
        turnRate
      ) *
        (
          Math.sin(
            futureHeading,
          ) -
          Math.sin(
            heading,
          )
        ),
  };
}

/* =========================================================
   Predictor 3 — Online Residual Model

   Physics predicts the majority of motion.
   Online learning only predicts the remaining error.
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
      0,
    ],

    sampleCount:
      0,

    learningRate:
      0.012,
  };
}

function buildResidualFeatures(
  target:
    AircraftState,

  turnAcceleration:
    number,

  horizonSeconds:
    number,
) {
  const heading =
    toRadians(
      target.heading,
    );

  return [
    1,

    clamp(
      target.turnRate /
        10,
      -1.5,
      1.5,
    ),

    clamp(
      turnAcceleration /
        6,
      -1.5,
      1.5,
    ),

    clamp(
      target.bank /
        40,
      -1.5,
      1.5,
    ),

    clamp(
      (
        target.airspeed -
        28
      ) /
        20,
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
  target:
    AircraftState,

  turnAcceleration:
    number,

  horizonSeconds:
    number,

  model:
    ResidualModel,
): Vector2 {
  const physics =
    ctrvPrediction(
      target,
      horizonSeconds,
    );

  const features =
    buildResidualFeatures(
      target,
      turnAcceleration,
      horizonSeconds,
    );

  return {
    x:
      physics.x +
      dot(
        model.weightsX,
        features,
      ) *
        RESIDUAL_SCALE_METERS,

    y:
      physics.y +
      dot(
        model.weightsY,
        features,
      ) *
        RESIDUAL_SCALE_METERS,
  };
}

function trainResidualModel(
  model:
    ResidualModel,

  features:
    number[],

  ctrvPoint:
    Vector2,

  actualPosition:
    Vector2,
) {
  const targetResidualX =
    (
      actualPosition.x -
      ctrvPoint.x
    ) /
    RESIDUAL_SCALE_METERS;

  const targetResidualY =
    (
      actualPosition.y -
      ctrvPoint.y
    ) /
    RESIDUAL_SCALE_METERS;

  const predictionResidualX =
    dot(
      model.weightsX,
      features,
    );

  const predictionResidualY =
    dot(
      model.weightsY,
      features,
    );

  const errorX =
    clamp(
      targetResidualX -
        predictionResidualX,
      -1.5,
      1.5,
    );

  const errorY =
    clamp(
      targetResidualY -
        predictionResidualY,
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
        0.55,

      learned:
        0.3,
    };
  }

  const cvScore =
    1 /
    Math.max(
      cvError,
      2,
    );

  const ctrvScore =
    1 /
    Math.max(
      ctrvError,
      2,
    );

  const learnedScore =
    1 /
    Math.max(
      learnedError,
      2,
    );

  const total =
    cvScore +
    ctrvScore +
    learnedScore;

  return {
    cv:
      cvScore /
      total,

    ctrv:
      ctrvScore /
      total,

    learned:
      learnedScore /
      total,
  };
}

function adaptivePrediction(
  simulation:
    InternalSimulation,

  horizonSeconds:
    number,
): Vector2 {
  const cv =
    constantVelocityPrediction(
      simulation.intruder,
      horizonSeconds,
    );

  const ctrv =
    ctrvPrediction(
      simulation.intruder,
      horizonSeconds,
    );

  const learned =
    learnedPrediction(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      horizonSeconds,
      simulation.residualModel,
    );

  return weightedPoint(
    cv,
    ctrv,
    learned,
    calculatePredictorWeights(
      simulation.errors,
    ),
  );
}

/* =========================================================
   Sector Helpers
   ========================================================= */

function getDefenseSectors(
  activeSectorId:
    string | null,
): DefenseSector[] {
  return DEFENSE_SECTOR_DEFINITIONS.map(
    (
      sector,
    ) => ({
      id:
        sector.id,

      label:
        sector.label,

      color:
        sector.color,

      center: {
        ...sector.center,
      },

      station: {
        ...sector.station,
      },

      radiusMeters:
        sector.radiusMeters,

      interceptorId:
        sector.interceptorId,

      active:
        sector.id ===
        activeSectorId,
    }),
  );
}

function findIntrudedSector(
  intruder:
    Vector2,
) {
  return DEFENSE_SECTOR_DEFINITIONS.find(
    (
      sector,
    ) =>
      distanceBetween(
        intruder,
        sector.center,
      ) <=
      sector.radiusMeters,
  );
}

/* =========================================================
   Interceptor Creation
   ========================================================= */

function createInterceptor(
  id:
    number,

  station:
    Vector2,

  sectorId:
    string,

  speedLimitMps:
    number,

  patrolPhase:
    number,
): InternalInterceptor {
  return {
    id,

    callsign:
      `INT-${id
        .toString()
        .padStart(
          2,
          "0",
        )}`,

    x:
      station.x,

    y:
      station.y,

    heading:
      id %
        2 ===
      0
        ? 220
        : 40,

    airspeed:
      22,

    altitude:
      118,

    turnRate:
      0,

    bank:
      0,

    mode:
      "PATROL",

    stationId:
      `STATION-${id}`,

    sectorId,

    status:
      "READY",

    speedLimitMps,

    targetAirspeed:
      22,

    assigned:
      false,

    patrolPhase,
  };
}

/* =========================================================
   Initial Simulation
   ========================================================= */

function createInitialSimulation():
  InternalSimulation {
  const now =
    performance.now();

  const interceptors =
    DEFENSE_SECTOR_DEFINITIONS.map(
      (
        sector,
        index,
      ) =>
        createInterceptor(
          sector.interceptorId,
          sector.station,
          sector.id,
          58 +
            index *
              5,
          index *
            Math.PI /
            2,
        ),
    );

  const trails:
    Record<
      number,
      Vector2[]
    > = {};

  interceptors.forEach(
    (
      interceptor,
    ) => {
      trails[
        interceptor.id
      ] = [];
    },
  );

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

    intruder: {
      id:
        99,

      callsign:
        "INTRUDER-UAV",

      x:
        -1450,

      y:
        -840,

      heading:
        58,

      airspeed:
        28,

      altitude:
        132,

      turnRate:
        0,

      bank:
        0,

      mode:
        "UNKNOWN",
    },

    interceptors,

    activeSectorId:
      null,

    assignedInterceptorId:
      null,

    manualDispatchInterceptorId:
      null,

    autoDefenseEnabled:
      true,

    intruderCommandedAirspeed:
      28,

    adaptiveSpeedSync:
      true,

    desiredSeparationMeters:
      180,

    minimumSeparationMeters:
      95,

    intruderTrail:
      [],

    interceptorTrails:
      trails,

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

    intruderTurnAcceleration:
      0,

    previousIntruderTurnRate:
      0,

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
   Intruder Dynamics
   ========================================================= */

function updateIntruder(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  const gamepad =
    getConnectedGamepad();

  let targetAirspeed =
    simulation.intruderCommandedAirspeed;

  simulation.previousIntruderTurnRate =
    simulation.intruder.turnRate;

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

    simulation.intruder.mode =
      "USB MANUAL";

    simulation.intruder.turnRate =
      steering *
      12;

    targetAirspeed =
      simulation.intruderCommandedAirspeed +
      speedAxis *
        10;
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

    simulation.intruder.mode =
      "SIM AUTO";

    const time =
      simulation.simTimeSeconds;

    simulation.intruder.turnRate =
      clamp(
        Math.sin(
          time /
            5.1,
        ) *
          6.8 +
          Math.sin(
            time /
              1.9,
          ) *
            2.4,
        -10,
        10,
      );
  }

  simulation.intruderTurnAcceleration =
    (
      simulation.intruder.turnRate -
      simulation.previousIntruderTurnRate
    ) /
    Math.max(
      deltaSeconds,
      0.01,
    );

  targetAirspeed =
    clamp(
      targetAirspeed,
      12,
      50,
    );

  simulation.intruder.airspeed +=
    (
      targetAirspeed -
      simulation.intruder
        .airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.6,
    );

  simulation.intruder.heading =
    normalizeHeading(
      simulation.intruder
        .heading +
        simulation.intruder
          .turnRate *
          deltaSeconds,
    );

  simulation.intruder.bank =
    clamp(
      simulation.intruder
        .turnRate *
        3.2,
      -40,
      40,
    );

  const velocity =
    velocityVector(
      simulation.intruder,
    );

  simulation.intruder.x +=
    velocity.x *
    deltaSeconds;

  simulation.intruder.y +=
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
          simulation.intruder,
          horizon,
        ),
    );

  simulation.ctrvPath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        ctrvPrediction(
          simulation.intruder,
          horizon,
        ),
    );

  simulation.learnedPath =
    PREDICTION_HORIZONS.map(
      (
        horizon,
      ) =>
        learnedPrediction(
          simulation.intruder,
          simulation.intruderTurnAcceleration,
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
          simulation,
          horizon,
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

      const actual = {
        x:
          simulation.intruder.x,

        y:
          simulation.intruder.y,
      };

      simulation.errors.cv.push(
        distanceBetween(
          actual,
          pending.cv,
        ),
      );

      simulation.errors.ctrv.push(
        distanceBetween(
          actual,
          pending.ctrv,
        ),
      );

      simulation.errors.learned.push(
        distanceBetween(
          actual,
          pending.learned,
        ),
      );

      simulation.errors.adaptive.push(
        distanceBetween(
          actual,
          pending.adaptive,
        ),
      );

      trainResidualModel(
        simulation.residualModel,
        pending.features,
        pending.ctrv,
        actual,
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

function queuePrediction(
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
      simulation.intruder,
      PREDICTION_HORIZON_SECONDS,
    );

  const ctrv =
    ctrvPrediction(
      simulation.intruder,
      PREDICTION_HORIZON_SECONDS,
    );

  const features =
    buildResidualFeatures(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      PREDICTION_HORIZON_SECONDS,
    );

  const learned =
    learnedPrediction(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      PREDICTION_HORIZON_SECONDS,
      simulation.residualModel,
    );

  simulation.pendingPredictions.push(
    {
      dueAt:
        now +
        PREDICTION_HORIZON_SECONDS *
          1000,

      features,

      cv,

      ctrv,

      learned,

      adaptive:
        weightedPoint(
          cv,
          ctrv,
          learned,
          weights,
        ),
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

  queuePrediction(
    simulation,
    now,
  );
}

/* =========================================================
   Automatic Sector Detection / Dispatch
   ========================================================= */

function updateDefenseAssignment(
  simulation:
    InternalSimulation,

  now:
    number,
) {
  const intrudedSector =
    findIntrudedSector(
      simulation.intruder,
    );

  simulation.activeSectorId =
    intrudedSector?.id ??
    null;

  let assignedId:
    number | null =
    null;

  if (
    simulation.autoDefenseEnabled &&
    intrudedSector
  ) {
    assignedId =
      intrudedSector.interceptorId;
  } else if (
    simulation.manualDispatchInterceptorId !==
    null
  ) {
    assignedId =
      simulation.manualDispatchInterceptorId;
  }

  if (
    assignedId !==
    simulation.assignedInterceptorId
  ) {
    simulation.assignedInterceptorId =
      assignedId;

    if (
      assignedId !==
      null
    ) {
      simulation.mode =
        "RENDEZVOUS";

      simulation.modeSince =
        now;
    }
  }

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      interceptor.assigned =
        interceptor.id ===
        simulation.assignedInterceptorId;
    },
  );
}

/* =========================================================
   Guidance Target
   ========================================================= */

function calculateGuidanceTarget(
  simulation:
    InternalSimulation,
) {
  const selectedPath =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath
      : simulation.baselinePath;

  const predictedPoint =
    selectedPath[
      3
    ] ??
    simulation.intruder;

  let predictedHeading =
    simulation.intruder
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

  const direction =
    headingVector(
      predictedHeading,
    );

  return {
    x:
      predictedPoint.x -
      direction.x *
        simulation.desiredSeparationMeters,

    y:
      predictedPoint.y -
      direction.y *
        simulation.desiredSeparationMeters,
  };
}

/* =========================================================
   Generic Fixed-Wing Steering
   ========================================================= */

function steerAircraftToward(
  aircraft:
    AircraftState,

  target:
    Vector2,

  targetSpeed:
    number,

  speedLimit:
    number,

  deltaSeconds:
    number,

  maximumTurnRate:
    number,
) {
  const desiredHeading =
    bearingBetween(
      aircraft,
      target,
    );

  const headingError =
    normalizeSignedAngle(
      desiredHeading -
      aircraft.heading,
    );

  aircraft.turnRate =
    clamp(
      headingError *
        0.18,
      -maximumTurnRate,
      maximumTurnRate,
    );

  aircraft.heading =
    normalizeHeading(
      aircraft.heading +
        aircraft.turnRate *
          deltaSeconds,
    );

  aircraft.bank =
    clamp(
      aircraft.turnRate *
        3.2,
      -42,
      42,
    );

  aircraft.airspeed +=
    (
      clamp(
        targetSpeed,
        16,
        speedLimit,
      ) -
      aircraft.airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.8,
    );

  const velocity =
    velocityVector(
      aircraft,
    );

  aircraft.x +=
    velocity.x *
    deltaSeconds;

  aircraft.y +=
    velocity.y *
    deltaSeconds;
}

/* =========================================================
   Station Patrol
   ========================================================= */

function patrolPointFor(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  station:
    Vector2,
) {
  const radius =
    125;

  const angle =
    simulation.simTimeSeconds *
      0.22 +
    interceptor.patrolPhase;

  return {
    x:
      station.x +
      Math.cos(
        angle,
      ) *
        radius,

    y:
      station.y +
      Math.sin(
        angle,
      ) *
        radius,
  };
}

/* =========================================================
   Interceptor Update
   ========================================================= */

function updateInterceptors(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  const guidanceTarget =
    calculateGuidanceTarget(
      simulation,
    );

  simulation.guidanceTarget =
    guidanceTarget;

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      const sector =
        DEFENSE_SECTOR_DEFINITIONS.find(
          (
            item,
          ) =>
            item.interceptorId ===
            interceptor.id,
        );

      if (
        !sector
      ) {
        return;
      }

      const station =
        sector.station;

      const assigned =
        interceptor.id ===
        simulation.assignedInterceptorId;

      if (
        simulation.mode ===
        "ABORT" ||
        simulation.mode ===
        "RTL"
      ) {
        interceptor.status =
          "RTL";

        interceptor.mode =
          "RTL";

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            32,
          );

        steerAircraftToward(
          interceptor,
          station,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          11,
        );

        return;
      }

      if (
        !assigned
      ) {
        const patrolTarget =
          patrolPointFor(
            simulation,
            interceptor,
            station,
          );

        interceptor.status =
          distanceBetween(
            interceptor,
            station,
          ) <
          220
            ? "PATROL"
            : "RTL";

        interceptor.mode =
          interceptor.status;

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            24,
          );

        steerAircraftToward(
          interceptor,
          patrolTarget,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          8,
        );

        return;
      }

      if (
        simulation.mode ===
        "HOLD"
      ) {
        interceptor.status =
          "HOLD";

        interceptor.mode =
          "HOLD";

        const holdTarget = {
          x:
            interceptor.x +
            Math.cos(
              simulation.simTimeSeconds *
                0.45,
            ) *
              120,

          y:
            interceptor.y +
            Math.sin(
              simulation.simTimeSeconds *
                0.45,
            ) *
              120,
        };

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            26,
          );

        steerAircraftToward(
          interceptor,
          holdTarget,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          9,
        );

        return;
      }

      const separation =
        distanceBetween(
          interceptor,
          simulation.intruder,
        );

      const closingRate =
        calculateClosingRate(
          simulation.intruder,
          interceptor,
        );

      const predictedClosest =
        predictClosestApproach(
          simulation.intruder,
          interceptor,
        );

      const safetyRecovery =
        predictedClosest <
        simulation.minimumSeparationMeters +
          18;

      if (
        safetyRecovery
      ) {
        interceptor.status =
          "RECOVERY";

        interceptor.mode =
          "SAFETY RECOVERY";

        const awayHeading =
          bearingBetween(
            simulation.intruder,
            interceptor,
          );

        const awayDirection =
          headingVector(
            awayHeading,
          );

        const recoveryTarget = {
          x:
            interceptor.x +
            awayDirection.x *
              420,

          y:
            interceptor.y +
            awayDirection.y *
              420,
        };

        interceptor.targetAirspeed =
          clamp(
            simulation.intruder
              .airspeed -
              6,
            18,
            interceptor.speedLimitMps,
          );

        steerAircraftToward(
          interceptor,
          recoveryTarget,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          12,
        );

        return;
      }

      const separationError =
        separation -
        simulation.desiredSeparationMeters;

      const desiredHeading =
        bearingBetween(
          interceptor,
          guidanceTarget,
        );

      const headingError =
        Math.abs(
          normalizeSignedAngle(
            desiredHeading -
            interceptor.heading,
          ),
        );

      const turnDemand =
        clamp(
          headingError /
            90,
          0,
          1,
        );

      let targetSpeed =
        simulation.intruder
          .airspeed;

      if (
        simulation.adaptiveSpeedSync
      ) {
        const distanceBoost =
          clamp(
            separationError *
              0.045,
            -6,
            28,
          );

        const closingDamping =
          clamp(
            closingRate *
              0.52,
            -4,
            8,
          );

        const turnPenalty =
          turnDemand *
          5;

        targetSpeed =
          simulation.intruder
            .airspeed +
          distanceBoost -
          closingDamping -
          turnPenalty;
      } else {
        targetSpeed =
          simulation.intruder
            .airspeed +
          clamp(
            separationError *
              0.03,
            -4,
            20,
          );
      }

      interceptor.targetAirspeed =
        clamp(
          targetSpeed,
          18,
          interceptor.speedLimitMps,
        );

      if (
        separation <=
        simulation.desiredSeparationMeters +
          35
      ) {
        interceptor.status =
          "SHADOW";

        interceptor.mode =
          "AI SHADOW";
      } else {
        interceptor.status =
          "DISPATCHED";

        interceptor.mode =
          "AI INTERCEPT";
      }

      steerAircraftToward(
        interceptor,
        guidanceTarget,
        interceptor.targetAirspeed,
        interceptor.speedLimitMps,
        deltaSeconds,
        12,
      );
    },
  );
}

/* =========================================================
   Mode Transitions
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
      1
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
      0.8
  ) {
    setInternalMode(
      simulation,
      "RENDEZVOUS",
      now,
    );
  }

  const assigned =
    simulation.interceptors.find(
      (
        interceptor,
      ) =>
        interceptor.id ===
        simulation.assignedInterceptorId,
    );

  if (
    simulation.mode ===
      "RENDEZVOUS" &&
    assigned
  ) {
    const distance =
      distanceBetween(
        simulation.intruder,
        assigned,
      );

    if (
      distance <=
      simulation.desiredSeparationMeters +
        35
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
   Trail Sampling
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

  simulation.intruderTrail.push({
    x:
      simulation.intruder.x,

    y:
      simulation.intruder.y,
  });

  simulation.intruderTrail =
    simulation.intruderTrail.slice(
      -TRAIL_LIMIT,
    );

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      const existing =
        simulation.interceptorTrails[
          interceptor.id
        ] ??
        [];

      existing.push({
        x:
          interceptor.x,

        y:
          interceptor.y,
      });

      simulation.interceptorTrails[
        interceptor.id
      ] =
        existing.slice(
          -TRAIL_LIMIT,
        );
    },
  );
}

/* =========================================================
   Snapshot
   ========================================================= */

function createSnapshot(
  simulation:
    InternalSimulation,
): InterceptSnapshot {
  const assigned =
    simulation.interceptors.find(
      (
        interceptor,
      ) =>
        interceptor.id ===
        simulation.assignedInterceptorId,
    );

  const distanceMeters =
    assigned
      ? distanceBetween(
          simulation.intruder,
          assigned,
        )
      : null;

  const closingRateMps =
    assigned
      ? calculateClosingRate(
          simulation.intruder,
          assigned,
        )
      : null;

  const predictedClosestSeparationMeters =
    assigned
      ? predictClosestApproach(
          simulation.intruder,
          assigned,
        )
      : null;

  const anticipatorySafetyGate =
    predictedClosestSeparationMeters !==
      null &&
    predictedClosestSeparationMeters <
      simulation.minimumSeparationMeters +
        18;

  const remainingDistance =
    distanceMeters !==
    null
      ? Math.max(
          0,
          distanceMeters -
            simulation.desiredSeparationMeters,
        )
      : 0;

  const etaSeconds =
    closingRateMps !==
      null &&
    closingRateMps >
      0.25
      ? remainingDistance /
        closingRateMps
      : null;

  const cvError =
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
    cvError !==
        null &&
      adaptiveError !==
        null &&
      cvError >
        0
      ? (
          (
            cvError -
            adaptiveError
          ) /
          cvError
        ) *
        100
      : null;

  const weights =
    calculatePredictorWeights(
      simulation.errors,
    );

  const highestWeight =
    Math.max(
      weights.cv,
      weights.ctrv,
      weights.learned,
    );

  const selectedPredictor:
    "CV" |
    "CTRV" |
    "ADAPTIVE" =
    highestWeight ===
    weights.cv
      ? "CV"
      : highestWeight ===
          weights.ctrv
        ? "CTRV"
        : "ADAPTIVE";

  const validationSamples =
    simulation.errors.adaptive
      .length;

  const sampleConfidence =
    clamp(
      validationSamples /
        20,
      0,
      1,
    );

  const qualityConfidence =
    adaptiveError ===
    null
      ? 0.35
      : clamp(
          1 -
            adaptiveError /
              120,
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

    intruder: {
      ...simulation.intruder,
    },

    interceptors:
      simulation.interceptors.map(
        (
          interceptor,
        ) => ({
          ...interceptor,
        }),
      ),

    sectors:
      getDefenseSectors(
        simulation.activeSectorId,
      ),

    activeSectorId:
      simulation.activeSectorId,

    assignedInterceptorId:
      simulation.assignedInterceptorId,

    autoDefenseEnabled:
      simulation.autoDefenseEnabled,

    intruderTrail: [
      ...simulation.intruderTrail,
    ],

    interceptorTrails:
      Object.fromEntries(
        Object.entries(
          simulation.interceptorTrails,
        ).map(
          (
            [
              key,
              trail,
            ],
          ) => [
            Number(
              key,
            ),

            [
              ...trail,
            ],
          ],
        ),
      ),

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

    distanceMeters,

    closingRateMps,

    etaSeconds,

    desiredSeparationMeters:
      simulation.desiredSeparationMeters,

    minimumSeparationMeters:
      simulation.minimumSeparationMeters,

    separationSafe:
      distanceMeters ===
        null ||
      distanceMeters >=
        simulation.minimumSeparationMeters,

    predictedClosestSeparationMeters,

    anticipatorySafetyGate,

    ai: {
      model:
        "Adaptive CV / CTRV / Online Residual Ensemble",

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
        cvError,

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
      intruderCommandedAirspeed:
        simulation.intruderCommandedAirspeed,

      adaptiveSync:
        simulation.adaptiveSpeedSync,
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

          updateIntruder(
            simulation,
            deltaSeconds,
          );

          updatePredictionEngine(
            simulation,
            now,
          );

          updateDefenseAssignment(
            simulation,
            now,
          );

          updateAutomaticModeTransitions(
            simulation,
            now,
          );

          updateInterceptors(
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

  const setIntruderCommandedAirspeed =
    useCallback(
      (
        value:
          number,
      ) => {
        simulationRef.current.intruderCommandedAirspeed =
          clamp(
            value,
            12,
            50,
          );

        publish();
      },
      [
        publish,
      ],
    );

  const setInterceptorSpeedLimit =
    useCallback(
      (
        interceptorId:
          number,

        value:
          number,
      ) => {
        const interceptor =
          simulationRef.current.interceptors.find(
            (
              item,
            ) =>
              item.id ===
              interceptorId,
          );

        if (
          !interceptor
        ) {
          return;
        }

        interceptor.speedLimitMps =
          clamp(
            value,
            25,
            80,
          );

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
            130,
            350,
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

  const setAutoDefenseEnabled =
    useCallback(
      (
        enabled:
          boolean,
      ) => {
        simulationRef.current.autoDefenseEnabled =
          enabled;

        publish();
      },
      [
        publish,
      ],
    );

  const dispatchInterceptor =
    useCallback(
      (
        interceptorId:
          number,
      ) => {
        const simulation =
          simulationRef.current;

        simulation.manualDispatchInterceptorId =
          interceptorId;

        simulation.assignedInterceptorId =
          interceptorId;

        setInternalMode(
          simulation,
          "RENDEZVOUS",
        );

        publish();
      },
      [
        publish,
      ],
    );

  const startIntercept =
    useCallback(
      () => {
        const simulation =
          simulationRef.current;

        if (
          simulation.assignedInterceptorId ===
          null
        ) {
          const nearest =
            [...simulation.interceptors].sort(
              (
                first,
                second,
              ) =>
                distanceBetween(
                  first,
                  simulation.intruder,
                ) -
                distanceBetween(
                  second,
                  simulation.intruder,
                ),
            )[0];

          if (
            nearest
          ) {
            simulation.manualDispatchInterceptorId =
              nearest.id;

            simulation.assignedInterceptorId =
              nearest.id;
          }
        }

        setInternalMode(
          simulation,
          "PREDICT",
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

        setIntruderCommandedAirspeed,

        setInterceptorSpeedLimit,

        setDesiredSeparation,

        setAdaptiveSpeedSync,

        setAutoDefenseEnabled,

        dispatchInterceptor,

        startTracking: () =>
          setMode(
            "ACQUIRE",
          ),

        startIntercept,

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
        dispatchInterceptor,
        reset,
        setAdaptiveSpeedSync,
        setAutoDefenseEnabled,
        setDesiredSeparation,
        setInterceptorSpeedLimit,
        setIntruderCommandedAirspeed,
        setMode,
        setPredictorMode,
        startIntercept,
        toggleRunning,
      ],
    );

  return {
    snapshot,
    actions,
  };
}