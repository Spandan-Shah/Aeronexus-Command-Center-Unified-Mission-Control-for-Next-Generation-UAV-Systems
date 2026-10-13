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
  | "TRACK"
  | "ALERT"
  | "INTERCEPT"
  | "SHADOW"
  | "HOLD"
  | "ABORT"
  | "RTL";

export type PredictorMode =
  | "baseline"
  | "ml";

export type ThreatPhase =
  | "OUTSIDE"
  | "PERIMETER_ALERT"
  | "CRITICAL_ZONE"
  | "INTERCEPTING"
  | "CONTAINED"
  | "MISSION_COMPLETE";

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
  | "PATROL"
  | "DISPATCHED"
  | "RENDEZVOUS"
  | "SHADOW"
  | "HOLD"
  | "RECOVERY"
  | "RTL";

export type InterceptorState =
  AircraftState & {
    stationId: string;
    station: Vector2;
    color: string;
    status: InterceptorStatus;
    speedLimitMps: number;
    targetAirspeed: number;
    assigned: boolean;
    formationSlot: number;
  };

export type CriticalZone = {
  id: string;
  label: string;
  subtitle: string;
  points: Vector2[];
  center: Vector2;
  active: boolean;
};

export type ThreatAlert = {
  active: boolean;
  latched: boolean;
  phase: ThreatPhase;
  title: string;
  message: string;
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
  baselineErrorMeters: number | null;
  ctrvErrorMeters: number | null;
  learnedErrorMeters: number | null;
  mlErrorMeters: number | null;
  improvementPercent: number | null;
  validationSamples: number;
};

export type InterceptSnapshot = {
  running: boolean;
  mode: InterceptMode;
  predictorMode: PredictorMode;
  simTimeSeconds: number;

  intruder: AircraftState;
  interceptors: InterceptorState[];

  perimeter: Vector2[];
  criticalZones: CriticalZone[];

  alert: ThreatAlert;
  interceptAuthorized: boolean;

  intruderFlightPlan: Vector2[];
  activeWaypointIndex: number;
  missionId: string;

  intruderTrail: Vector2[];

  interceptorTrails: Record<
    number,
    Vector2[]
  >;

  baselinePath: Vector2[];
  ctrvPath: Vector2[];
  mlPath: Vector2[];

  formationTargets: Record<
    number,
    Vector2
  >;

  nearestSeparationMeters:
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
      | "CV"
      | "CTRV"
      | "ADAPTIVE";

    confidence: number;

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

  speedControl: {
    intruderCommandedAirspeed:
      number;

    adaptiveSync:
      boolean;
  };

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

type PredictorErrors = {
  cv: number[];
  ctrv: number[];
  learned: number[];
  adaptive: number[];
};

type PendingPrediction = {
  dueAt: number;
  features: number[];
  cv: Vector2;
  ctrv: Vector2;
  learned: Vector2;
  adaptive: Vector2;
};

type InternalInterceptor =
  InterceptorState & {
    patrolPhase: number;
  };

type InternalSimulation = {
  running: boolean;

  mode: InterceptMode;

  predictorMode:
    PredictorMode;

  simTimeSeconds:
    number;

  intruder:
    AircraftState;

  interceptors:
    InternalInterceptor[];

  perimeter:
    Vector2[];

  criticalZones:
    CriticalZone[];

  alert:
    ThreatAlert;

  interceptAuthorized:
    boolean;

  intruderWasInsidePerimeter:
    boolean;

  missionComplete:
    boolean;

  missionId:
    string;

  intruderFlightPlan:
    Vector2[];

  activeWaypointIndex:
    number;

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

  formationTargets:
    Record<
      number,
      Vector2
    >;

  pendingPredictions:
    PendingPrediction[];

  errors:
    PredictorErrors;

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
  650;

const TRAIL_INTERVAL_MS =
  150;

const TRAIL_LIMIT =
  220;

const ERROR_HISTORY_LIMIT =
  40;

const RESIDUAL_SCALE_METERS =
  70;

const PREDICTION_HORIZONS = [
  0.75,
  1.5,
  2.25,
  3,
  3.75,
  4.5,
];

/*
 * Fictional simulation perimeter around the local ENU
 * origin. It is not an official or real-world airspace
 * boundary.
 */
const MONITORED_PERIMETER:
  Vector2[] = [
  {
    x: -1850,
    y: -300,
  },
  {
    x: -1620,
    y: -1050,
  },
  {
    x: -850,
    y: -1510,
  },
  {
    x: 50,
    y: -1580,
  },
  {
    x: 920,
    y: -1410,
  },
  {
    x: 1600,
    y: -890,
  },
  {
    x: 1840,
    y: -120,
  },
  {
    x: 1680,
    y: 720,
  },
  {
    x: 1110,
    y: 1370,
  },
  {
    x: 240,
    y: 1580,
  },
  {
    x: -720,
    y: 1450,
  },
  {
    x: -1450,
    y: 920,
  },
];

/*
 * These are deliberately fictional demo overlays.
 * They are not actual facility/cantonment boundaries.
 */
const CRITICAL_ZONE_DEFINITIONS:
  Omit<
    CriticalZone,
    "active"
  >[] = [
  {
    id:
      "civil-hospital-demo",

    label:
      "CIVIL HOSPITAL",

    subtitle:
      "Critical Infrastructure Demo Zone",

    center: {
      x: -470,
      y: 310,
    },

    points: [
      {
        x: -830,
        y: 40,
      },
      {
        x: -620,
        y: -80,
      },
      {
        x: -300,
        y: -20,
      },
      {
        x: -120,
        y: 260,
      },
      {
        x: -220,
        y: 610,
      },
      {
        x: -570,
        y: 690,
      },
      {
        x: -850,
        y: 480,
      },
    ],
  },

  {
    id:
      "cantonment-demo",

    label:
      "CANTONMENT",

    subtitle:
      "Restricted Infrastructure Demo Zone",

    center: {
      x: 590,
      y: -300,
    },

    points: [
      {
        x: 210,
        y: -610,
      },
      {
        x: 520,
        y: -790,
      },
      {
        x: 860,
        y: -670,
      },
      {
        x: 1030,
        y: -350,
      },
      {
        x: 860,
        y: -30,
      },
      {
        x: 510,
        y: 20,
      },
      {
        x: 250,
        y: -180,
      },
    ],
  },
];

const INTERCEPTOR_CONFIG = [
  {
    id:
      1,

    station: {
      x: -1320,
      y: 1070,
    },

    color:
      "#00E5FF",

    speedLimitMps:
      72,

    formationSlot:
      0,
  },

  {
    id:
      2,

    station: {
      x: 1320,
      y: 1070,
    },

    color:
      "#B78CFF",

    speedLimitMps:
      78,

    formationSlot:
      1,
  },

  {
    id:
      3,

    station: {
      x: -1320,
      y: -1070,
    },

    color:
      "#FFB84D",

    speedLimitMps:
      84,

    formationSlot:
      2,
  },

  {
    id:
      4,

    station: {
      x: 1320,
      y: -1070,
    },

    color:
      "#72FF98",

    speedLimitMps:
      90,

    formationSlot:
      3,
  },
];

/*
 * All four formation points remain behind/lateral to the
 * target's motion rather than putting an interceptor directly
 * in front of it.
 */
const FORMATION_OFFSETS = [
  120,
  160,
  200,
  240,
];

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
  return normalizeHeading(
    toDegrees(
      Math.atan2(
        to.x -
          from.x,

        to.y -
          from.y,
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

function pointInPolygon(
  point:
    Vector2,

  polygon:
    Vector2[],
) {
  let inside =
    false;

  for (
    let current =
      0,
      previous =
        polygon.length -
        1;

    current <
      polygon.length;

    previous =
      current++
  ) {
    const currentPoint =
      polygon[
        current
      ];

    const previousPoint =
      polygon[
        previous
      ];

    if (
      !currentPoint ||
      !previousPoint
    ) {
      continue;
    }

    const intersects =
      (
        currentPoint.y >
        point.y
      ) !==
        (
          previousPoint.y >
          point.y
        ) &&
      point.x <
        (
          (
            previousPoint.x -
            currentPoint.x
          ) *
            (
              point.y -
              currentPoint.y
            )
        ) /
          (
            previousPoint.y -
              currentPoint.y ||
            Number.EPSILON
          ) +
        currentPoint.x;

    if (
      intersects
    ) {
      inside =
        !inside;
    }
  }

  return inside;
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
   Predictor 1: Constant Velocity
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
   Predictor 2: CTRV
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
   Online Residual Predictor
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
        8,
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
        22,
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

  secondsAhead:
    number,

  model:
    ResidualModel,
): Vector2 {
  const physics =
    ctrvPrediction(
      target,
      secondsAhead,
    );

  const features =
    buildResidualFeatures(
      target,
      turnAcceleration,
      secondsAhead,
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

  actual:
    Vector2,
) {
  const targetResidualX =
    (
      actual.x -
      ctrvPoint.x
    ) /
    RESIDUAL_SCALE_METERS;

  const targetResidualY =
    (
      actual.y -
      ctrvPoint.y
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

function predictorWeights(
  errors:
    PredictorErrors,
): PredictorWeights {
  const cv =
    average(
      errors.cv,
    );

  const ctrv =
    average(
      errors.ctrv,
    );

  const learned =
    average(
      errors.learned,
    );

  if (
    cv ===
      null ||
    ctrv ===
      null ||
    learned ===
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
      cv,
      2,
    );

  const ctrvScore =
    1 /
    Math.max(
      ctrv,
      2,
    );

  const learnedScore =
    1 /
    Math.max(
      learned,
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

function adaptivePrediction(
  simulation:
    InternalSimulation,

  secondsAhead:
    number,
): Vector2 {
  const cv =
    constantVelocityPrediction(
      simulation.intruder,
      secondsAhead,
    );

  const ctrv =
    ctrvPrediction(
      simulation.intruder,
      secondsAhead,
    );

  const learned =
    learnedPrediction(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      secondsAhead,
      simulation.residualModel,
    );

  return weightedPoint(
    cv,
    ctrv,
    learned,
    predictorWeights(
      simulation.errors,
    ),
  );
}

/* =========================================================
   Random Mission Plan
   ========================================================= */

function randomBetween(
  minimum:
    number,

  maximum:
    number,
) {
  return (
    minimum +
    Math.random() *
      (
        maximum -
        minimum
      )
  );
}

function createRandomFlightPlan() {
  const entries: Vector2[] = [
    {
      x: -2350,
      y: -950,
    },
    {
      x: -2250,
      y: 1050,
    },
    {
      x: 2250,
      y: -1050,
    },
    {
      x: 2350,
      y: 950,
    },
  ];

  const entryIndex =
    Math.floor(
      Math.random() *
        entries.length,
    );

  const exitIndex =
    (
      entryIndex +
      2
    ) %
    entries.length;

  const start =
    entries[
      entryIndex
    ] ?? {
      x: -2350,
      y: -950,
    };

  const finish =
    entries[
      exitIndex
    ] ?? {
      x: 2350,
      y: 950,
    };

  const middleOne = {
    x:
      randomBetween(
        -800,
        800,
      ),

    y:
      randomBetween(
        -850,
        850,
      ),
  };

  const middleTwo = {
    x:
      randomBetween(
        -900,
        900,
      ),

    y:
      randomBetween(
        -850,
        850,
      ),
  };

  return [
    {
      ...start,
    },

    middleOne,

    middleTwo,

    {
      ...finish,
    },
  ];
}

/* =========================================================
   Interceptor Creation
   ========================================================= */

function createInterceptor(
  config:
    typeof INTERCEPTOR_CONFIG[number],

  index:
    number,
): InternalInterceptor {
  return {
    id:
      config.id,

    callsign:
      `INT-${config.id}`,

    x:
      config.station.x,

    y:
      config.station.y,

    heading:
      45 +
      index *
        90,

    airspeed:
      23,

    altitude:
      120,

    turnRate:
      0,

    bank:
      0,

    mode:
      "PATROL",

    stationId:
      `STATION-${config.id}`,

    station: {
      ...config.station,
    },

    color:
      config.color,

    status:
      "PATROL",

    speedLimitMps:
      config.speedLimitMps,

    targetAirspeed:
      23,

    assigned:
      false,

    formationSlot:
      config.formationSlot,

    patrolPhase:
      index *
      Math.PI /
      2,
  };
}

/* =========================================================
   Initial State
   ========================================================= */

function createInitialSimulation():
  InternalSimulation {
  const now =
    performance.now();

  const flightPlan =
    createRandomFlightPlan();

  const first =
    flightPlan[
      0
    ] ?? {
      x: -2300,
      y: -900,
    };

  const second =
    flightPlan[
      1
    ] ?? {
      x: 0,
      y: 0,
    };

  const interceptors =
    INTERCEPTOR_CONFIG.map(
      (
        config,
        index,
      ) =>
        createInterceptor(
          config,
          index,
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

  const criticalZones =
    CRITICAL_ZONE_DEFINITIONS.map(
      (
        zone,
      ) => ({
        ...zone,

        center: {
          ...zone.center,
        },

        points:
          zone.points.map(
            (
              point,
            ) => ({
              ...point,
            }),
          ),

        active:
          false,
      }),
    );

  return {
    running:
      true,

    mode:
      "IDLE",

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
        first.x,

      y:
        first.y,

      heading:
        bearingBetween(
          first,
          second,
        ),

      airspeed:
        28,

      altitude:
        135,

      turnRate:
        0,

      bank:
        0,

      mode:
        "SIM AUTO",
    },

    interceptors,

    perimeter:
      MONITORED_PERIMETER.map(
        (
          point,
        ) => ({
          ...point,
        }),
      ),

    criticalZones,

    alert: {
      active:
        false,

      latched:
        false,

      phase:
        "OUTSIDE",

      title:
        "AIRSPACE CLEAR",

      message:
        "No unauthorized UAV inside the monitored perimeter.",
    },

    interceptAuthorized:
      false,

    intruderWasInsidePerimeter:
      false,

    missionComplete:
      false,

    missionId:
      `MN-${Math.floor(
        1000 +
          Math.random() *
            9000,
      )}`,

    intruderFlightPlan:
      flightPlan,

    activeWaypointIndex:
      1,

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

    formationTargets:
      {},

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
   Gamepad
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
   Intruder
   ========================================================= */

function updateIntruder(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  if (
    simulation.missionComplete
  ) {
    simulation.intruder.mode =
      "MISSION COMPLETE";

    simulation.intruder.airspeed +=
      (
        0 -
        simulation.intruder
          .airspeed
      ) *
      Math.min(
        1,
        deltaSeconds *
          2,
      );

    return;
  }

  const gamepad =
    getConnectedGamepad();

  simulation.previousIntruderTurnRate =
    simulation.intruder.turnRate;

  let targetSpeed =
    simulation.intruderCommandedAirspeed;

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

    targetSpeed +=
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

    const waypoint =
      simulation.intruderFlightPlan[
        simulation.activeWaypointIndex
      ];

    if (
      !waypoint
    ) {
      simulation.missionComplete =
        true;

      return;
    }

    const desiredHeading =
      bearingBetween(
        simulation.intruder,
        waypoint,
      );

    const headingError =
      normalizeSignedAngle(
        desiredHeading -
        simulation.intruder
          .heading,
      );

    const gentleVariation =
      Math.sin(
        simulation.simTimeSeconds *
          0.55,
      ) *
      0.75;

    simulation.intruder.turnRate =
      clamp(
        headingError *
          0.18 +
          gentleVariation,
        -10,
        10,
      );

    if (
      distanceBetween(
        simulation.intruder,
        waypoint,
      ) <
      90
    ) {
      if (
        simulation.activeWaypointIndex >=
        simulation.intruderFlightPlan
          .length -
          1
      ) {
        simulation.missionComplete =
          true;
      } else {
        simulation.activeWaypointIndex +=
          1;
      }
    }
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

  targetSpeed =
    clamp(
      targetSpeed,
      12,
      50,
    );

  simulation.intruder.airspeed +=
    (
      targetSpeed -
      simulation.intruder
        .airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        1.7,
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

  const weights =
    predictorWeights(
      simulation.errors,
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
   Alert Detection
   ========================================================= */

function updateThreatAlert(
  simulation:
    InternalSimulation,
) {
  const insidePerimeter =
    pointInPolygon(
      simulation.intruder,
      simulation.perimeter,
    );

  const activeCriticalZone =
    simulation.criticalZones.find(
      (
        zone,
      ) =>
        pointInPolygon(
          simulation.intruder,
          zone.points,
        ),
    );

  simulation.criticalZones =
    simulation.criticalZones.map(
      (
        zone,
      ) => ({
        ...zone,

        active:
          zone.id ===
          activeCriticalZone?.id,
      }),
    );

  if (
    activeCriticalZone
  ) {
    simulation.alert = {
      active:
        true,

      latched:
        true,

      phase:
        "CRITICAL_ZONE",

      title:
        "CRITICAL INFRASTRUCTURE ALERT",

      message:
        `Unauthorized UAV entered ${activeCriticalZone.label} demo protection zone.`,
    };

    simulation.mode =
      simulation.interceptAuthorized
        ? "INTERCEPT"
        : "ALERT";

    return;
  }

  if (
    insidePerimeter &&
    !simulation.intruderWasInsidePerimeter
  ) {
    simulation.alert = {
      active:
        true,

      latched:
        true,

      phase:
        "PERIMETER_ALERT",

      title:
        "MONITORED AIRSPACE ALERT",

      message:
        "Unauthorized UAV crossed the green monitored-airspace perimeter. Operator authorization required.",
    };

    simulation.mode =
      simulation.interceptAuthorized
        ? "INTERCEPT"
        : "ALERT";
  }

  simulation.intruderWasInsidePerimeter =
    insidePerimeter;

  if (
    simulation.interceptAuthorized &&
    simulation.alert.latched
  ) {
    simulation.alert = {
      ...simulation.alert,

      active:
        true,

      phase:
        "INTERCEPTING",

      title:
        "FOUR-UAV RESPONSE ACTIVE",

      message:
        "All four interceptor UAVs are converging on independent non-contact formation slots.",
    };

    simulation.mode =
      "INTERCEPT";
  }

  if (
    simulation.missionComplete
  ) {
    simulation.alert = {
      ...simulation.alert,

      phase:
        "MISSION_COMPLETE",

      title:
        "INTRUDER FLIGHT COMPLETE",

      message:
        "This simulated intruder mission is complete. Reset or refresh to generate a new flight plan.",
    };
  }
}

/* =========================================================
   Formation Targets
   ========================================================= */

function predictedHeadingFor(
  simulation:
    InternalSimulation,
) {
  const path =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath
      : simulation.baselinePath;

  if (
    path.length <
    2
  ) {
    return simulation.intruder
      .heading;
  }

  const previous =
    path[
      path.length -
        2
    ];

  const last =
    path[
      path.length -
        1
    ];

  if (
    !previous ||
    !last
  ) {
    return simulation.intruder
      .heading;
  }

  return bearingBetween(
    previous,
    last,
  );
}

function createFormationTargets(
  simulation:
    InternalSimulation,
) {
  const selectedPath =
    simulation.predictorMode ===
    "ml"
      ? simulation.mlPath
      : simulation.baselinePath;

  const predictedPosition =
    selectedPath[
      3
    ] ?? {
      x:
        simulation.intruder.x,

      y:
        simulation.intruder.y,
    };

  const predictedHeading =
    predictedHeadingFor(
      simulation,
    );

  const output:
    Record<
      number,
      Vector2
    > = {};

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      const offset =
        FORMATION_OFFSETS[
          interceptor.formationSlot
        ] ??
        180;

      const slotBearing =
        normalizeHeading(
          predictedHeading +
            offset,
        );

      const direction =
        headingVector(
          slotBearing,
        );

      output[
        interceptor.id
      ] = {
        x:
          predictedPosition.x +
          direction.x *
            simulation.desiredSeparationMeters,

        y:
          predictedPosition.y +
          direction.y *
            simulation.desiredSeparationMeters,
      };
    },
  );

  simulation.formationTargets =
    output;
}

/* =========================================================
   Aircraft Steering
   ========================================================= */

function steerAircraft(
  aircraft:
    AircraftState,

  target:
    Vector2,

  targetSpeed:
    number,

  maximumSpeed:
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
        0.2,
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
        18,
        maximumSpeed,
      ) -
      aircraft.airspeed
    ) *
    Math.min(
      1,
      deltaSeconds *
        2.2,
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
   Patrol
   ========================================================= */

function patrolTarget(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  const angle =
    simulation.simTimeSeconds *
      0.18 +
    interceptor.patrolPhase;

  const radius =
    130;

  return {
    x:
      interceptor.station.x +
      Math.cos(
        angle,
      ) *
        radius,

    y:
      interceptor.station.y +
      Math.sin(
        angle,
      ) *
        radius,
  };
}

/* =========================================================
   Simple Inter-UAV Deconfliction
   ========================================================= */

function applyDeconfliction(
  interceptor:
    InternalInterceptor,

  interceptors:
    InternalInterceptor[],

  desiredTarget:
    Vector2,
) {
  let adjustmentX =
    0;

  let adjustmentY =
    0;

  interceptors.forEach(
    (
      other,
    ) => {
      if (
        other.id ===
        interceptor.id
      ) {
        return;
      }

      const separation =
        distanceBetween(
          interceptor,
          other,
        );

      if (
        separation >=
        85
      ) {
        return;
      }

      const awayHeading =
        bearingBetween(
          other,
          interceptor,
        );

      const away =
        headingVector(
          awayHeading,
        );

      const strength =
        (
          85 -
          separation
        ) *
        2.2;

      adjustmentX +=
        away.x *
        strength;

      adjustmentY +=
        away.y *
        strength;
    },
  );

  return {
    x:
      desiredTarget.x +
      adjustmentX,

    y:
      desiredTarget.y +
      adjustmentY,
  };
}

/* =========================================================
   Interceptors
   ========================================================= */

function updateInterceptors(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  createFormationTargets(
    simulation,
  );

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      if (
        simulation.mode ===
          "RTL" ||
        simulation.mode ===
          "ABORT"
      ) {
        interceptor.assigned =
          false;

        interceptor.status =
          "RTL";

        interceptor.mode =
          "RTL";

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            34,
          );

        steerAircraft(
          interceptor,
          interceptor.station,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          11,
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

        const holdTarget =
          patrolTarget(
            simulation,
            interceptor,
          );

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            26,
          );

        steerAircraft(
          interceptor,
          holdTarget,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          8,
        );

        return;
      }

      if (
        !simulation.interceptAuthorized
      ) {
        interceptor.assigned =
          false;

        interceptor.status =
          "PATROL";

        interceptor.mode =
          "PATROL";

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            24,
          );

        steerAircraft(
          interceptor,
          patrolTarget(
            simulation,
            interceptor,
          ),
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          8,
        );

        return;
      }

      interceptor.assigned =
        true;

      const slot =
        simulation.formationTargets[
          interceptor.id
        ];

      if (
        !slot
      ) {
        return;
      }

      const safeTarget =
        applyDeconfliction(
          interceptor,
          simulation.interceptors,
          slot,
        );

      const intruderSeparation =
        distanceBetween(
          interceptor,
          simulation.intruder,
        );

      const closestApproach =
        predictClosestApproach(
          simulation.intruder,
          interceptor,
        );

      /*
       * Anticipatory non-contact safety recovery.
       */
      if (
        closestApproach <
        simulation.minimumSeparationMeters +
          15
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

        const away =
          headingVector(
            awayHeading,
          );

        const recoveryPoint = {
          x:
            interceptor.x +
            away.x *
              380,

          y:
            interceptor.y +
            away.y *
              380,
        };

        interceptor.targetAirspeed =
          clamp(
            simulation.intruder
              .airspeed -
              4,
            18,
            interceptor.speedLimitMps,
          );

        steerAircraft(
          interceptor,
          recoveryPoint,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          12,
        );

        return;
      }

      const distanceToSlot =
        distanceBetween(
          interceptor,
          safeTarget,
        );

      const closingRate =
        calculateClosingRate(
          simulation.intruder,
          interceptor,
        );

      const desiredHeading =
        bearingBetween(
          interceptor,
          safeTarget,
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

      /*
       * Main fix for what was visible in f.mp4:
       *
       * far from the slot -> large catch-up speed
       * approaching slot -> progressively match target speed
       * high turn demand -> reduce excess speed
       */
      let targetSpeed =
        simulation.intruder
          .airspeed;

      if (
        distanceToSlot >
        650
      ) {
        targetSpeed =
          simulation.intruder
            .airspeed +
          clamp(
            distanceToSlot *
              0.055,
            24,
            52,
          );
      } else if (
        distanceToSlot >
        300
      ) {
        targetSpeed =
          simulation.intruder
            .airspeed +
          clamp(
            distanceToSlot *
              0.045,
            14,
            32,
          );
      } else {
        targetSpeed =
          simulation.intruder
            .airspeed +
          clamp(
            (
              distanceToSlot -
              70
            ) *
              0.035,
            -3,
            14,
          );
      }

      if (
        simulation.adaptiveSpeedSync
      ) {
        targetSpeed -=
          clamp(
            closingRate *
              0.35,
            -4,
            7,
          );

        targetSpeed -=
          turnDemand *
          5;
      }

      interceptor.targetAirspeed =
        clamp(
          targetSpeed,
          20,
          interceptor.speedLimitMps,
        );

      if (
        distanceToSlot <
          75 &&
        intruderSeparation >
          simulation.minimumSeparationMeters
      ) {
        interceptor.status =
          "SHADOW";

        interceptor.mode =
          "AI SHADOW";
      } else {
        interceptor.status =
          distanceToSlot <
          250
            ? "RENDEZVOUS"
            : "DISPATCHED";

        interceptor.mode =
          "AI INTERCEPT";
      }

      steerAircraft(
        interceptor,
        safeTarget,
        interceptor.targetAirspeed,
        interceptor.speedLimitMps,
        deltaSeconds,
        12,
      );
    },
  );
}

/* =========================================================
   Containment Evaluation
   ========================================================= */

function updateContainmentState(
  simulation:
    InternalSimulation,
) {
  if (
    !simulation.interceptAuthorized
  ) {
    return;
  }

  const allInFormation =
    simulation.interceptors.every(
      (
        interceptor,
      ) => {
        const target =
          simulation.formationTargets[
            interceptor.id
          ];

        if (
          !target
        ) {
          return false;
        }

        return (
          distanceBetween(
            interceptor,
            target,
          ) <
          90
        );
      },
    );

  if (
    allInFormation
  ) {
    simulation.mode =
      "SHADOW";

    simulation.alert = {
      active:
        true,

      latched:
        true,

      phase:
        "CONTAINED",

      title:
        "NON-CONTACT CONTAINMENT ESTABLISHED",

      message:
        "All four interceptors are established in predictive shadow formation.",
    };
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
      const trail =
        simulation.interceptorTrails[
          interceptor.id
        ] ??
        [];

      trail.push({
        x:
          interceptor.x,

        y:
          interceptor.y,
      });

      simulation.interceptorTrails[
        interceptor.id
      ] =
        trail.slice(
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
  const separations =
    simulation.interceptors.map(
      (
        interceptor,
      ) =>
        distanceBetween(
          simulation.intruder,
          interceptor,
        ),
    );

  const nearestSeparationMeters =
    simulation.interceptAuthorized
      ? Math.min(
          ...separations,
        )
      : null;

  const nearestInterceptor =
    simulation.interceptAuthorized
      ? simulation.interceptors[
          separations.indexOf(
            Math.min(
              ...separations,
            ),
          )
        ]
      : undefined;

  const closingRateMps =
    nearestInterceptor
      ? calculateClosingRate(
          simulation.intruder,
          nearestInterceptor,
        )
      : null;

  const closestPredictions =
    simulation.interceptAuthorized
      ? simulation.interceptors.map(
          (
            interceptor,
          ) =>
            predictClosestApproach(
              simulation.intruder,
              interceptor,
            ),
        )
      : [];

  const predictedClosestSeparationMeters =
    closestPredictions.length >
    0
      ? Math.min(
          ...closestPredictions,
        )
      : null;

  const anticipatorySafetyGate =
    predictedClosestSeparationMeters !==
      null &&
    predictedClosestSeparationMeters <
      simulation.minimumSeparationMeters +
        15;

  const formationEtas =
    simulation.interceptAuthorized
      ? simulation.interceptors.map(
          (
            interceptor,
          ) => {
            const target =
              simulation.formationTargets[
                interceptor.id
              ];

            if (
              !target
            ) {
              return 0;
            }

            const remaining =
              distanceBetween(
                interceptor,
                target,
              );

            const excessSpeed =
              Math.max(
                6,
                interceptor.targetAirspeed -
                  simulation.intruder
                    .airspeed,
              );

            return (
              remaining /
              excessSpeed
            );
          },
        )
      : [];

  const etaSeconds =
    formationEtas.length >
    0
      ? Math.max(
          ...formationEtas,
        )
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
    predictorWeights(
      simulation.errors,
    );

  const maximumWeight =
    Math.max(
      weights.cv,
      weights.ctrv,
      weights.learned,
    );

  const selectedPredictor:
    | "CV"
    | "CTRV"
    | "ADAPTIVE" =
    maximumWeight ===
    weights.cv
      ? "CV"
      : maximumWeight ===
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

          station: {
            ...interceptor.station,
          },
        }),
      ),

    perimeter:
      simulation.perimeter.map(
        (
          point,
        ) => ({
          ...point,
        }),
      ),

    criticalZones:
      simulation.criticalZones.map(
        (
          zone,
        ) => ({
          ...zone,

          center: {
            ...zone.center,
          },

          points:
            zone.points.map(
              (
                point,
              ) => ({
                ...point,
              }),
            ),
        }),
      ),

    alert: {
      ...simulation.alert,
    },

    interceptAuthorized:
      simulation.interceptAuthorized,

    intruderFlightPlan:
      simulation.intruderFlightPlan.map(
        (
          point,
        ) => ({
          ...point,
        }),
      ),

    activeWaypointIndex:
      simulation.activeWaypointIndex,

    missionId:
      simulation.missionId,

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
              value,
            ],
          ) => [
            Number(
              key,
            ),

            [
              ...value,
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

    formationTargets:
      Object.fromEntries(
        Object.entries(
          simulation.formationTargets,
        ).map(
          (
            [
              key,
              value,
            ],
          ) => [
            Number(
              key,
            ),

            {
              ...value,
            },
          ],
        ),
      ),

    nearestSeparationMeters,

    closingRateMps,

    etaSeconds,

    desiredSeparationMeters:
      simulation.desiredSeparationMeters,

    minimumSeparationMeters:
      simulation.minimumSeparationMeters,

    separationSafe:
      nearestSeparationMeters ===
        null ||
      nearestSeparationMeters >=
        simulation.minimumSeparationMeters,

    predictedClosestSeparationMeters,

    anticipatorySafetyGate,

    ai: {
      model:
        "CV + CTRV + Online Residual Ensemble",

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
  /*
   * Important for randomized mission plans:
   * create the simulation only once per component mount.
   */
  const simulationRef =
    useRef<
      InternalSimulation |
      null
    >(null);

  if (
    simulationRef.current ===
    null
  ) {
    simulationRef.current =
      createInitialSimulation();
  }

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<InterceptSnapshot>(
      () =>
        createSnapshot(
          simulationRef.current!,
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
        const simulation =
          simulationRef.current;

        if (
          !simulation
        ) {
          return;
        }

        setSnapshot(
          createSnapshot(
            simulation,
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

        if (
          !simulation
        ) {
          return;
        }

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

          updateThreatAlert(
            simulation,
          );

          updateInterceptors(
            simulation,
            deltaSeconds,
          );

          updateContainmentState(
            simulation,
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

  const toggleRunning =
    useCallback(
      () => {
        const simulation =
          simulationRef.current;

        if (
          !simulation
        ) {
          return;
        }

        simulation.running =
          !simulation.running;

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
        value:
          PredictorMode,
      ) => {
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.predictorMode =
          value;

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
        if (
          !simulationRef.current
        ) {
          return;
        }

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
          simulationRef.current?.interceptors.find(
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
            40,
            90,
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
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.desiredSeparationMeters =
          clamp(
            value,
            140,
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
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.adaptiveSpeedSync =
          enabled;

        publish();
      },
      [
        publish,
      ],
    );

  const interceptAll =
    useCallback(
      () => {
        const simulation =
          simulationRef.current;

        if (
          !simulation ||
          !simulation.alert.latched
        ) {
          return;
        }

        simulation.interceptAuthorized =
          true;

        simulation.mode =
          "INTERCEPT";

        simulation.interceptors.forEach(
          (
            interceptor,
          ) => {
            interceptor.assigned =
              true;

            interceptor.status =
              "DISPATCHED";

            interceptor.mode =
              "AI INTERCEPT";
          },
        );

        simulation.alert = {
          active:
            true,

          latched:
            true,

          phase:
            "INTERCEPTING",

          title:
            "FOUR-UAV RESPONSE ACTIVE",

          message:
            "Operator authorized all four interceptors for predictive non-contact rendezvous.",
        };

        publish();
      },
      [
        publish,
      ],
    );

  const hold =
    useCallback(
      () => {
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.mode =
          "HOLD";

        publish();
      },
      [
        publish,
      ],
    );

  const rtl =
    useCallback(
      () => {
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.mode =
          "RTL";

        simulationRef.current.interceptAuthorized =
          false;

        publish();
      },
      [
        publish,
      ],
    );

  const abort =
    useCallback(
      () => {
        if (
          !simulationRef.current
        ) {
          return;
        }

        simulationRef.current.mode =
          "ABORT";

        simulationRef.current.interceptAuthorized =
          false;

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

        interceptAll,

        startIntercept:
          interceptAll,

        startTracking: () => {
          if (
            simulationRef.current
          ) {
            simulationRef.current.mode =
              "TRACK";

            publish();
          }
        },

        shadow: () => {
          if (
            simulationRef.current
          ) {
            simulationRef.current.mode =
              "SHADOW";

            publish();
          }
        },

        hold,

        rtl,

        abort,

        idle: () => {
          if (
            simulationRef.current
          ) {
            simulationRef.current.mode =
              "IDLE";

            publish();
          }
        },
      }),
      [
        abort,
        hold,
        interceptAll,
        publish,
        reset,
        rtl,
        setAdaptiveSpeedSync,
        setDesiredSeparation,
        setInterceptorSpeedLimit,
        setIntruderCommandedAirspeed,
        setPredictorMode,
        toggleRunning,
      ],
    );

  return {
    snapshot,
    actions,
  };
}