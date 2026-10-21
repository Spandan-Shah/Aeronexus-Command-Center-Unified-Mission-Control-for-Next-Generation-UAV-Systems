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

export type FleetPhase =
  | "STANDBY"
  | "PURSUIT"
  | "STAGING"
  | "RENDEZVOUS"
  | "FORMATION"
  | "SHADOW"
  | "RECOVERY"
  | "RTL";

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
  | "PURSUIT"
  | "STAGING"
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

    status:
      InterceptorStatus;

    speedLimitMps:
      number;

    targetAirspeed:
      number;

    assigned:
      boolean;

    formationSlot:
      number;

    guidanceLocked:
      boolean;

    slotErrorMeters:
      number | null;

    etaSeconds:
      number | null;
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

export type AiModuleState = {
  id: string;
  label: string;

  category:
    | "ML"
    | "ALGORITHM";

  state:
    | "ACTIVE"
    | "LEARNING"
    | "WARMING"
    | "STANDBY"
    | "REJECTED";

  detail: string;
};

export type MlValidationState = {
  status:
    | "WARMING"
    | "VALIDATED"
    | "REJECTED";

  bestPhysicsErrorMeters:
    number | null;

  learnedErrorMeters:
    number | null;

  improvementPercent:
    number | null;

  contributionPercent:
    number;

  reason:
    string;
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

export type InterceptSnapshot = {
  running: boolean;

  mode:
    InterceptMode;

  fleetPhase:
    FleetPhase;

  fleetStableSeconds:
    number;

  predictorMode:
    PredictorMode;

  simTimeSeconds:
    number;

  intruder:
    AircraftState;

  interceptors:
    InterceptorState[];

  perimeter:
    Vector2[];

  criticalZones:
    CriticalZone[];

  alert:
    ThreatAlert;

  interceptAuthorized:
    boolean;

  intruderFlightPlan:
    Vector2[];

  activeWaypointIndex:
    number;

  missionId:
    string;

  intruderTrail:
    Vector2[];

  interceptorTrails:
    Record<number, Vector2[]>;

  baselinePath:
    Vector2[];

  ctrvPath:
    Vector2[];

  mlPath:
    Vector2[];

  formationTargets:
    Record<number, Vector2>;

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

  mlValidation:
    MlValidationState;

  ai: {
    model: string;

    selectedPredictor:
      | "CV"
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

    modules:
      AiModuleState[];
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

type NeuralResidualModel = {
  inputSize: number;
  hiddenSize: number;

  w1: number[][];
  b1: number[];

  w2: number[][];
  b2: number[];

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

    lockedInterceptPoint:
      Vector2 | null;

    lockedLeadSeconds:
      number;

    lockExpiresAt:
      number;

    pursuitStableSeconds:
      number;

    stagingStableSeconds:
      number;

    slotStableSeconds:
      number;

    shadowBreakSeconds:
      number;

    recoveryClearSeconds:
      number;

    recoveryEnteredAt:
      number;
  };

type InternalSimulation = {
  running: boolean;

  mode:
    InterceptMode;

  fleetPhase:
    FleetPhase;

  fleetStableSeconds:
    number;

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
    Record<number, Vector2[]>;

  baselinePath:
    Vector2[];

  ctrvPath:
    Vector2[];

  learnedPath:
    Vector2[];

  mlPath:
    Vector2[];

  formationTargets:
    Record<number, Vector2>;

  pendingPredictions:
    PendingPrediction[];

  errors:
    PredictorErrors;

  neuralModel:
    NeuralResidualModel;

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

const GRAVITY =
  9.80665;

const PREDICTION_HORIZON_SECONDS =
  3;

const PREDICTION_INTERVAL_MS =
  650;

const TRAIL_INTERVAL_MS =
  150;

const TRAIL_LIMIT =
  240;

const ERROR_HISTORY_LIMIT =
  48;

const RESIDUAL_SCALE_METERS =
  80;

const HARD_SAFETY_MARGIN =
  22;

const FLEET_MINIMUM_SEPARATION =
  95;

/*
 * Phase gates.
 */
const PURSUIT_CAPTURE_RANGE =
  900;

const PURSUIT_CAPTURE_POINT_ERROR =
  330;

const PURSUIT_CAPTURE_HOLD_SECONDS =
  0.7;

const STAGING_POSITION_TOLERANCE =
  190;

const STAGING_HEADING_TOLERANCE =
  20;

const STAGING_SPEED_TOLERANCE =
  6;

const STAGING_HOLD_SECONDS =
  1.2;

const SLOT_CAPTURE_TOLERANCE =
  85;

const SLOT_HEADING_TOLERANCE =
  12;

const SLOT_SPEED_TOLERANCE =
  4.5;

const SLOT_CAPTURE_HOLD_SECONDS =
  2;

const SLOT_BREAK_TOLERANCE =
  150;

const SHADOW_BREAK_HOLD_SECONDS =
  1.4;

const FLEET_STABLE_HOLD_SECONDS =
  2;

const RECOVERY_CLEAR_HOLD_SECONDS =
  1.1;

const INTERCEPT_REPLAN_SECONDS =
  4;

/*
 * ML validation.
 */
const ML_MIN_TRAINING_SAMPLES =
  18;

const ML_MIN_VALIDATION_SAMPLES =
  12;

const ML_REQUIRED_ADVANTAGE =
  0.02;

const PREDICTION_HORIZONS = [
  0.75,
  1.5,
  2.25,
  3,
  3.75,
  4.5,
];

const LEAD_SEARCH_HORIZONS = [
  4,
  6,
  8,
  10,
  12,
  15,
  18,
  22,
  26,
];

/* =========================================================
   Fictional Demo Geography
   ========================================================= */

const MONITORED_PERIMETER:
  Vector2[] = [
  { x: -1850, y: -300 },
  { x: -1620, y: -1050 },
  { x: -850, y: -1510 },
  { x: 50, y: -1580 },
  { x: 920, y: -1410 },
  { x: 1600, y: -890 },
  { x: 1840, y: -120 },
  { x: 1680, y: 720 },
  { x: 1110, y: 1370 },
  { x: 240, y: 1580 },
  { x: -720, y: 1450 },
  { x: -1450, y: 920 },
];

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
      { x: -830, y: 40 },
      { x: -620, y: -80 },
      { x: -300, y: -20 },
      { x: -120, y: 260 },
      { x: -220, y: 610 },
      { x: -570, y: 690 },
      { x: -850, y: 480 },
    ],
  },

  {
    id:
      "cantonment-demo",

    label:
      "CANTONMENT DEMO",

    subtitle:
      "Fictional Restricted Infrastructure Zone",

    center: {
      x: 590,
      y: -300,
    },

    points: [
      { x: 210, y: -610 },
      { x: 520, y: -790 },
      { x: 860, y: -670 },
      { x: 1030, y: -350 },
      { x: 860, y: -30 },
      { x: 510, y: 20 },
      { x: 250, y: -180 },
    ],
  },
];

const INTERCEPTOR_CONFIG = [
  {
    id: 1,

    station: {
      x: -1320,
      y: 1070,
    },

    color:
      "#00E5FF",

    speedLimitMps:
      75,

    formationSlot:
      0,
  },

  {
    id: 2,

    station: {
      x: 1320,
      y: 1070,
    },

    color:
      "#B78CFF",

    speedLimitMps:
      80,

    formationSlot:
      1,
  },

  {
    id: 3,

    station: {
      x: -1320,
      y: -1070,
    },

    color:
      "#FFB84D",

    speedLimitMps:
      85,

    formationSlot:
      2,
  },

  {
    id: 4,

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
] as const;

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
  ) % 360;
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
   Fixed-Wing Geometry
   ========================================================= */

function minimumTurnRadius(
  speed:
    number,

  maxBankDegrees:
    number,
) {
  const tangent =
    Math.tan(
      toRadians(
        Math.max(
          1,
          maxBankDegrees,
        ),
      ),
    );

  return (
    speed *
    speed /
    (
      GRAVITY *
      tangent
    )
  );
}

function requiredTurnRadiusToPoint(
  aircraft:
    AircraftState,

  target:
    Vector2,
) {
  const distance =
    distanceBetween(
      aircraft,
      target,
    );

  const bearing =
    bearingBetween(
      aircraft,
      target,
    );

  const headingError =
    Math.abs(
      normalizeSignedAngle(
        bearing -
        aircraft.heading,
      ),
    );

  if (
    headingError <
    3
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const angle =
    toRadians(
      Math.min(
        headingError,
        179,
      ),
    );

  const denominator =
    2 *
    Math.sin(
      angle,
    );

  if (
    Math.abs(
      denominator,
    ) <
    0.001
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    distance /
    Math.abs(
      denominator,
    )
  );
}

function turnToPointFeasible(
  aircraft:
    AircraftState,

  target:
    Vector2,

  maxBankDegrees:
    number,
) {
  const headingError =
    Math.abs(
      normalizeSignedAngle(
        bearingBetween(
          aircraft,
          target,
        ) -
        aircraft.heading,
      ),
    );

  if (
    headingError <=
    8
  ) {
    return true;
  }

  const minimumRadius =
    minimumTurnRadius(
      aircraft.airspeed,
      maxBankDegrees,
    );

  const requiredRadius =
    requiredTurnRadiusToPoint(
      aircraft,
      target,
    );

  return (
    requiredRadius >=
    minimumRadius *
      0.9
  );
}

function curvatureSafeCarrot(
  aircraft:
    AircraftState,

  target:
    Vector2,

  maxBankDegrees:
    number,
) {
  if (
    turnToPointFeasible(
      aircraft,
      target,
      maxBankDegrees,
    )
  ) {
    return target;
  }

  const targetBearing =
    bearingBetween(
      aircraft,
      target,
    );

  const signedError =
    normalizeSignedAngle(
      targetBearing -
      aircraft.heading,
    );

  const side =
    signedError >=
    0
      ? 1
      : -1;

  const radius =
    minimumTurnRadius(
      aircraft.airspeed,
      maxBankDegrees,
    );

  const forward =
    headingVector(
      aircraft.heading,
    );

  const lateral =
    headingVector(
      aircraft.heading +
        side *
          90,
    );

  const forwardDistance =
    clamp(
      radius *
        0.9,
      220,
      900,
    );

  const lateralDistance =
    clamp(
      radius *
        0.55,
      120,
      520,
    );

  return {
    x:
      aircraft.x +
      forward.x *
        forwardDistance +
      lateral.x *
        lateralDistance,

    y:
      aircraft.y +
      forward.y *
        forwardDistance +
      lateral.y *
        lateralDistance,
  };
}

function relativeTargetCoordinates(
  target:
    AircraftState,

  point:
    Vector2,
) {
  const forward =
    headingVector(
      target.heading,
    );

  const right =
    headingVector(
      target.heading +
        90,
    );

  const dx =
    point.x -
    target.x;

  const dy =
    point.y -
    target.y;

  return {
    forward:
      dx *
        forward.x +
      dy *
        forward.y,

    right:
      dx *
        right.x +
      dy *
        right.y,
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

  const relativeX =
    target.x -
    interceptor.x;

  const relativeY =
    target.y -
    interceptor.y;

  const range =
    Math.max(
      1,
      Math.hypot(
        relativeX,
        relativeY,
      ),
    );

  return (
    (
      interceptorVelocity.x -
      targetVelocity.x
    ) *
      (
        relativeX /
        range
      ) +
    (
      interceptorVelocity.y -
      targetVelocity.y
    ) *
      (
        relativeY /
        range
      )
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
   Physics Predictors
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
   Residual MLP
   ========================================================= */

function deterministicWeight(
  row:
    number,

  column:
    number,
) {
  return (
    Math.sin(
      (
        row +
        1
      ) *
        (
          column +
          2
        ) *
        1.731,
    ) *
    0.035
  );
}

function createNeuralResidualModel():
  NeuralResidualModel {
  const inputSize =
    8;

  const hiddenSize =
    10;

  return {
    inputSize,

    hiddenSize,

    w1:
      Array.from(
        {
          length:
            hiddenSize,
        },

        (
          _,
          hiddenIndex,
        ) =>
          Array.from(
            {
              length:
                inputSize,
            },

            (
              __,
              inputIndex,
            ) =>
              deterministicWeight(
                hiddenIndex,
                inputIndex,
              ),
          ),
      ),

    b1:
      Array.from(
        {
          length:
            hiddenSize,
        },
        () =>
          0,
      ),

    w2:
      Array.from(
        {
          length:
            2,
        },

        (
          _,
          outputIndex,
        ) =>
          Array.from(
            {
              length:
                hiddenSize,
            },

            (
              __,
              hiddenIndex,
            ) =>
              deterministicWeight(
                outputIndex +
                  20,
                hiddenIndex,
              ),
          ),
      ),

    b2: [
      0,
      0,
    ],

    sampleCount:
      0,

    learningRate:
      0.006,
  };
}

function buildMlFeatures(
  target:
    AircraftState,

  turnAcceleration:
    number,

  horizonSeconds:
    number,
) {
  return [
    clamp(
      target.turnRate /
        10,
      -1.5,
      1.5,
    ),

    clamp(
      turnAcceleration /
        10,
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
      toRadians(
        target.heading,
      ),
    ),

    Math.cos(
      toRadians(
        target.heading,
      ),
    ),

    clamp(
      horizonSeconds /
        8,
      0,
      1.5,
    ),

    clamp(
      (
        target.turnRate *
        target.airspeed
      ) /
        250,
      -1.5,
      1.5,
    ),
  ];
}

function mlForward(
  model:
    NeuralResidualModel,

  features:
    number[],
) {
  const hidden =
    Array.from(
      {
        length:
          model.hiddenSize,
      },

      (
        _,
        hiddenIndex,
      ) => {
        const row =
          model.w1[
            hiddenIndex
          ] ??
          [];

        let value =
          model.b1[
            hiddenIndex
          ] ??
          0;

        for (
          let inputIndex =
            0;

          inputIndex <
            model.inputSize;

          inputIndex +=
            1
        ) {
          value +=
            (
              row[
                inputIndex
              ] ??
              0
            ) *
            (
              features[
                inputIndex
              ] ??
              0
            );
        }

        return Math.tanh(
          value,
        );
      },
    );

  const output =
    Array.from(
      {
        length:
          2,
      },

      (
        _,
        outputIndex,
      ) => {
        const row =
          model.w2[
            outputIndex
          ] ??
          [];

        let value =
          model.b2[
            outputIndex
          ] ??
          0;

        for (
          let hiddenIndex =
            0;

          hiddenIndex <
            model.hiddenSize;

          hiddenIndex +=
            1
        ) {
          value +=
            (
              row[
                hiddenIndex
              ] ??
              0
            ) *
            (
              hidden[
                hiddenIndex
              ] ??
              0
            );
        }

        return Math.tanh(
          value,
        );
      },
    );

  return {
    hidden,
    output,
  };
}

function neuralPrediction(
  target:
    AircraftState,

  turnAcceleration:
    number,

  secondsAhead:
    number,

  model:
    NeuralResidualModel,
): Vector2 {
  const physics =
    ctrvPrediction(
      target,
      secondsAhead,
    );

  const features =
    buildMlFeatures(
      target,
      turnAcceleration,
      secondsAhead,
    );

  const result =
    mlForward(
      model,
      features,
    );

  return {
    x:
      physics.x +
      (
        result.output[
          0
        ] ??
        0
      ) *
        RESIDUAL_SCALE_METERS,

    y:
      physics.y +
      (
        result.output[
          1
        ] ??
        0
      ) *
        RESIDUAL_SCALE_METERS,
  };
}

function trainNeuralResidualModel(
  model:
    NeuralResidualModel,

  features:
    number[],

  ctrvPoint:
    Vector2,

  actual:
    Vector2,
) {
  const target = [
    clamp(
      (
        actual.x -
        ctrvPoint.x
      ) /
        RESIDUAL_SCALE_METERS,
      -1,
      1,
    ),

    clamp(
      (
        actual.y -
        ctrvPoint.y
      ) /
        RESIDUAL_SCALE_METERS,
      -1,
      1,
    ),
  ];

  const forward =
    mlForward(
      model,
      features,
    );

  const outputGradients =
    Array.from(
      {
        length:
          2,
      },

      (
        _,
        outputIndex,
      ) => {
        const output =
          forward.output[
            outputIndex
          ] ??
          0;

        const expected =
          target[
            outputIndex
          ] ??
          0;

        return (
          (
            output -
            expected
          ) *
          (
            1 -
            output *
              output
          )
        );
      },
    );

  const hiddenGradients =
    Array.from(
      {
        length:
          model.hiddenSize,
      },

      (
        _,
        hiddenIndex,
      ) => {
        let downstream =
          0;

        for (
          let outputIndex =
            0;

          outputIndex <
            2;

          outputIndex +=
            1
        ) {
          downstream +=
            (
              model.w2[
                outputIndex
              ]?.[
                hiddenIndex
              ] ??
              0
            ) *
            (
              outputGradients[
                outputIndex
              ] ??
              0
            );
        }

        const hidden =
          forward.hidden[
            hiddenIndex
          ] ??
          0;

        return (
          downstream *
          (
            1 -
            hidden *
              hidden
          )
        );
      },
    );

  for (
    let outputIndex =
      0;

    outputIndex <
      2;

    outputIndex +=
      1
  ) {
    const gradient =
      outputGradients[
        outputIndex
      ] ??
      0;

    const row =
      model.w2[
        outputIndex
      ];

    if (
      row
    ) {
      for (
        let hiddenIndex =
          0;

        hiddenIndex <
          model.hiddenSize;

        hiddenIndex +=
          1
      ) {
        row[
          hiddenIndex
        ] =
          clamp(
            (
              row[
                hiddenIndex
              ] ??
              0
            ) -
              model.learningRate *
                gradient *
                (
                  forward.hidden[
                    hiddenIndex
                  ] ??
                  0
                ),
            -2,
            2,
          );
      }
    }

    model.b2[
      outputIndex
    ] =
      clamp(
        (
          model.b2[
            outputIndex
          ] ??
          0
        ) -
          model.learningRate *
            gradient,
        -2,
        2,
      );
  }

  for (
    let hiddenIndex =
      0;

    hiddenIndex <
      model.hiddenSize;

    hiddenIndex +=
      1
  ) {
    const gradient =
      hiddenGradients[
        hiddenIndex
      ] ??
      0;

    const row =
      model.w1[
        hiddenIndex
      ];

    if (
      row
    ) {
      for (
        let inputIndex =
          0;

        inputIndex <
          model.inputSize;

        inputIndex +=
          1
      ) {
        row[
          inputIndex
        ] =
          clamp(
            (
              row[
                inputIndex
              ] ??
              0
            ) -
              model.learningRate *
                gradient *
                (
                  features[
                    inputIndex
                  ] ??
                  0
                ),
            -2,
            2,
          );
      }
    }

    model.b1[
      hiddenIndex
    ] =
      clamp(
        (
          model.b1[
            hiddenIndex
          ] ??
          0
        ) -
          model.learningRate *
            gradient,
        -2,
        2,
      );
  }

  model.sampleCount +=
    1;
}

/* =========================================================
   ML Validation / Ensemble
   ========================================================= */

function evaluateMlValidation(
  errors:
    PredictorErrors,

  trainingSamples:
    number,
): MlValidationState {
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

  const validationSamples =
    Math.min(
      errors.cv.length,
      errors.ctrv.length,
      errors.learned.length,
    );

  const bestPhysics =
    cv ===
      null ||
    ctrv ===
      null
      ? null
      : Math.min(
          cv,
          ctrv,
        );

  if (
    trainingSamples <
      ML_MIN_TRAINING_SAMPLES ||
    validationSamples <
      ML_MIN_VALIDATION_SAMPLES ||
    bestPhysics ===
      null ||
    learned ===
      null
  ) {
    return {
      status:
        "WARMING",

      bestPhysicsErrorMeters:
        bestPhysics,

      learnedErrorMeters:
        learned,

      improvementPercent:
        null,

      contributionPercent:
        0,

      reason:
        `Needs ${ML_MIN_TRAINING_SAMPLES} training and ${ML_MIN_VALIDATION_SAMPLES} validation samples.`,
    };
  }

  const improvementPercent =
    (
      (
        bestPhysics -
        learned
      ) /
      bestPhysics
    ) *
    100;

  const validated =
    learned <=
    bestPhysics *
      (
        1 -
        ML_REQUIRED_ADVANTAGE
      );

  if (
    !validated
  ) {
    return {
      status:
        "REJECTED",

      bestPhysicsErrorMeters:
        bestPhysics,

      learnedErrorMeters:
        learned,

      improvementPercent,

      contributionPercent:
        0,

      reason:
        "Residual MLP did not outperform the best physics predictor. ML guidance authority is disabled.",
    };
  }

  const contributionPercent =
    clamp(
      10 +
        improvementPercent *
          1.5,
      10,
      35,
    );

  return {
    status:
      "VALIDATED",

    bestPhysicsErrorMeters:
      bestPhysics,

    learnedErrorMeters:
      learned,

    improvementPercent,

    contributionPercent,

    reason:
      "Residual MLP passed rolling validation and receives bounded ensemble authority.",
  };
}

function predictorWeights(
  errors:
    PredictorErrors,

  trainingSamples:
    number,
): PredictorWeights {
  const cv =
    average(
      errors.cv,
    );

  const ctrv =
    average(
      errors.ctrv,
    );

  const validation =
    evaluateMlValidation(
      errors,
      trainingSamples,
    );

  if (
    cv ===
      null ||
    ctrv ===
      null
  ) {
    return {
      cv:
        0.25,

      ctrv:
        0.75,

      learned:
        0,
    };
  }

  const learnedShare =
    validation.contributionPercent /
    100;

  const physicsShare =
    1 -
    learnedShare;

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

  const total =
    cvScore +
    ctrvScore;

  return {
    cv:
      physicsShare *
      (
        cvScore /
        total
      ),

    ctrv:
      physicsShare *
      (
        ctrvScore /
        total
      ),

    learned:
      learnedShare,
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
    neuralPrediction(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      secondsAhead,
      simulation.neuralModel,
    );

  return weightedPoint(
    cv,
    ctrv,
    learned,
    predictorWeights(
      simulation.errors,
      simulation.neuralModel
        .sampleCount,
    ),
  );
}

/* =========================================================
   Random Scenario
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
  const entries:
    Vector2[] = [
    {
      x: -2450,
      y: -1000,
    },

    {
      x: -2380,
      y: 1100,
    },

    {
      x: 2380,
      y: -1100,
    },

    {
      x: 2450,
      y: 1000,
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
      x: -2450,
      y: -1000,
    };

  const finish =
    entries[
      exitIndex
    ] ?? {
      x: 2450,
      y: 1000,
    };

  const dx =
    finish.x -
    start.x;

  const dy =
    finish.y -
    start.y;

  const length =
    Math.max(
      1,
      Math.hypot(
        dx,
        dy,
      ),
    );

  const perpendicular = {
    x:
      -dy /
      length,

    y:
      dx /
      length,
  };

  const offsetOne =
    randomBetween(
      -320,
      320,
    );

  const offsetTwo =
    randomBetween(
      -320,
      320,
    );

  return [
    {
      ...start,
    },

    {
      x:
        start.x +
        dx *
          0.34 +
        perpendicular.x *
          offsetOne,

      y:
        start.y +
        dy *
          0.34 +
        perpendicular.y *
          offsetOne,
    },

    {
      x:
        start.x +
        dx *
          0.68 +
        perpendicular.x *
          offsetTwo,

      y:
        start.y +
        dy *
          0.68 +
        perpendicular.y *
          offsetTwo,
    },

    {
      ...finish,
    },
  ];
}

/* =========================================================
   Initial State
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
      normalizeHeading(
        45 +
        index *
          90,
      ),

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

    guidanceLocked:
      false,

    slotErrorMeters:
      null,

    etaSeconds:
      null,

    patrolPhase:
      (
        index *
        Math.PI
      ) /
      2,

    lockedInterceptPoint:
      null,

    lockedLeadSeconds:
      0,

    lockExpiresAt:
      0,

    pursuitStableSeconds:
      0,

    stagingStableSeconds:
      0,

    slotStableSeconds:
      0,

    shadowBreakSeconds:
      0,

    recoveryClearSeconds:
      0,

    recoveryEnteredAt:
      0,
  };
}

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
      x: -2400,
      y: -1000,
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

  return {
    running:
      true,

    mode:
      "IDLE",

    fleetPhase:
      "STANDBY",

    fleetStableSeconds:
      0,

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

    criticalZones:
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
      ),

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
      250,

    minimumSeparationMeters:
      140,

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

    neuralModel:
      createNeuralResidualModel(),

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
   Coordinated Fixed-Wing Dynamics
   ========================================================= */

function stepFixedWingBank(
  aircraft:
    AircraftState,

  desiredBankDegrees:
    number,

  targetSpeed:
    number,

  maximumSpeed:
    number,

  deltaSeconds:
    number,

  maximumBankDegrees:
    number,
) {
  const bankCommand =
    clamp(
      desiredBankDegrees,
      -maximumBankDegrees,
      maximumBankDegrees,
    );

  const rollRateLimit =
    42;

  const bankDelta =
    clamp(
      bankCommand -
        aircraft.bank,
      -rollRateLimit *
        deltaSeconds,
      rollRateLimit *
        deltaSeconds,
    );

  aircraft.bank +=
    bankDelta;

  const speedCommand =
    clamp(
      targetSpeed,
      12,
      maximumSpeed,
    );

  const accelerationLimit =
    7.5;

  const decelerationLimit =
    10;

  const speedError =
    speedCommand -
    aircraft.airspeed;

  aircraft.airspeed =
    Math.max(
      10,
      aircraft.airspeed +
        clamp(
          speedError,
          -decelerationLimit *
            deltaSeconds,
          accelerationLimit *
            deltaSeconds,
        ),
    );

  const speedForTurn =
    Math.max(
      aircraft.airspeed,
      12,
    );

  const turnRateRadians =
    (
      GRAVITY *
      Math.tan(
        toRadians(
          aircraft.bank,
        ),
      )
    ) /
    speedForTurn;

  aircraft.turnRate =
    toDegrees(
      turnRateRadians,
    );

  aircraft.heading =
    normalizeHeading(
      aircraft.heading +
        aircraft.turnRate *
          deltaSeconds,
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

function stepFixedWingToHeading(
  aircraft:
    AircraftState,

  desiredHeading:
    number,

  targetSpeed:
    number,

  maximumSpeed:
    number,

  deltaSeconds:
    number,

  maximumBankDegrees:
    number,
) {
  const headingError =
    normalizeSignedAngle(
      desiredHeading -
        aircraft.heading,
    );

  const desiredBank =
    clamp(
      headingError *
        0.9,
      -maximumBankDegrees,
      maximumBankDegrees,
    );

  stepFixedWingBank(
    aircraft,
    desiredBank,
    targetSpeed,
    maximumSpeed,
    deltaSeconds,
    maximumBankDegrees,
  );
}

function stepFixedWingToPoint(
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

  maximumBankDegrees:
    number,
) {
  const steeringPoint =
    curvatureSafeCarrot(
      aircraft,
      target,
      maximumBankDegrees,
    );

  stepFixedWingToHeading(
    aircraft,
    bearingBetween(
      aircraft,
      steeringPoint,
    ),
    targetSpeed,
    maximumSpeed,
    deltaSeconds,
    maximumBankDegrees,
  );
}

/* =========================================================
   Intruder Motion
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

    simulation.intruder.bank *=
      Math.max(
        0,
        1 -
          deltaSeconds *
            2,
      );

    simulation.intruder.turnRate =
      0;

    simulation.intruder.airspeed =
      Math.max(
        0,
        simulation.intruder.airspeed -
          8 *
            deltaSeconds,
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

    targetSpeed =
      clamp(
        targetSpeed +
          speedAxis *
            10,
        12,
        50,
      );

    stepFixedWingBank(
      simulation.intruder,
      steering *
        35,
      targetSpeed,
      50,
      deltaSeconds,
      35,
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

    stepFixedWingToPoint(
      simulation.intruder,
      waypoint,
      clamp(
        targetSpeed,
        12,
        50,
      ),
      50,
      deltaSeconds,
      35,
    );

    if (
      distanceBetween(
        simulation.intruder,
        waypoint,
      ) <
      100
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
        neuralPrediction(
          simulation.intruder,
          simulation.intruderTurnAcceleration,
          horizon,
          simulation.neuralModel,
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

      trainNeuralResidualModel(
        simulation.neuralModel,
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

  const learned =
    neuralPrediction(
      simulation.intruder,
      simulation.intruderTurnAcceleration,
      PREDICTION_HORIZON_SECONDS,
      simulation.neuralModel,
    );

  const weights =
    predictorWeights(
      simulation.errors,
      simulation.neuralModel
        .sampleCount,
    );

  simulation.pendingPredictions.push(
    {
      dueAt:
        now +
        PREDICTION_HORIZON_SECONDS *
          1000,

      features:
        buildMlFeatures(
          simulation.intruder,
          simulation.intruderTurnAcceleration,
          PREDICTION_HORIZON_SECONDS,
        ),

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
   Threat Detection
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

  const criticalZone =
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
          criticalZone?.id,
      }),
    );

  if (
    simulation.mode ===
      "SHADOW" &&
    simulation.interceptAuthorized
  ) {
    simulation.alert = {
      active:
        true,

      latched:
        true,

      phase:
        "CONTAINED",

      title:
        "NON-CONTACT INTERCEPT ESTABLISHED",

      message:
        "All four interceptor UAVs are stable in their assigned shadow slots.",
    };

    simulation.intruderWasInsidePerimeter =
      insidePerimeter;

    return;
  }

  if (
    criticalZone
  ) {
    simulation.alert = {
      active:
        true,

      latched:
        true,

      phase:
        simulation.interceptAuthorized
          ? "INTERCEPTING"
          : "CRITICAL_ZONE",

      title:
        simulation.interceptAuthorized
          ? "FOUR-UAV RESPONSE ACTIVE"
          : "CRITICAL INFRASTRUCTURE ALERT",

      message:
        simulation.interceptAuthorized
          ? "Predictive non-contact response remains active."
          : `Unauthorized UAV entered ${criticalZone.label} demo zone.`,
    };

    if (
      !simulation.interceptAuthorized
    ) {
      simulation.mode =
        "ALERT";
    }

    simulation.intruderWasInsidePerimeter =
      insidePerimeter;

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
        "Unauthorized UAV crossed the monitored perimeter. Operator authorization required.",
    };

    if (
      !simulation.interceptAuthorized
    ) {
      simulation.mode =
        "ALERT";
    }
  }

  simulation.intruderWasInsidePerimeter =
    insidePerimeter;

  if (
    simulation.interceptAuthorized &&
    simulation.alert.latched &&
    simulation.mode !==
      "HOLD" &&
    simulation.mode !==
      "RTL" &&
    simulation.mode !==
      "ABORT" &&
    simulation.mode !==
      "SHADOW"
  ) {
    simulation.mode =
      "INTERCEPT";

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
        "Locked pursuit, curvature-safe staging and non-contact formation guidance are active.",
    };
  }

  if (
    simulation.missionComplete &&
    !simulation.interceptAuthorized
  ) {
    simulation.alert = {
      ...simulation.alert,

      phase:
        "MISSION_COMPLETE",

      title:
        "INTRUDER FLIGHT COMPLETE",

      message:
        "The randomized intruder mission has finished. Generate a new plan for another scenario.",
    };
  }
}

/* =========================================================
   Prediction / Formation Geometry
   ========================================================= */

function predictedPositionAt(
  simulation:
    InternalSimulation,

  secondsAhead:
    number,
) {
  if (
    simulation.predictorMode ===
    "baseline"
  ) {
    return constantVelocityPrediction(
      simulation.intruder,
      secondsAhead,
    );
  }

  return adaptivePrediction(
    simulation,
    secondsAhead,
  );
}

function predictedHeadingAt(
  simulation:
    InternalSimulation,

  secondsAhead:
    number,
) {
  return normalizeHeading(
    simulation.intruder
      .heading +
      simulation.intruder
        .turnRate *
        secondsAhead,
  );
}

function finalShadowSlotAt(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  secondsAhead:
    number,
) {
  const predicted =
    predictedPositionAt(
      simulation,
      secondsAhead,
    );

  const heading =
    predictedHeadingAt(
      simulation,
      secondsAhead,
    );

  const forward =
    headingVector(
      heading,
    );

  const right =
    headingVector(
      heading +
        90,
    );

  const distance =
    simulation.desiredSeparationMeters;

  const layouts = [
    {
      behind:
        distance *
        1.0,

      lateral:
        -distance *
        0.46,
    },

    {
      behind:
        distance *
        1.0,

      lateral:
        distance *
        0.46,
    },

    {
      behind:
        distance *
        1.38,

      lateral:
        -distance *
        0.76,
    },

    {
      behind:
        distance *
        1.38,

      lateral:
        distance *
        0.76,
    },
  ];

  const layout =
    layouts[
      interceptor.formationSlot
    ] ??
    layouts[
      0
    ];

  if (
    !layout
  ) {
    return predicted;
  }

  return {
    x:
      predicted.x -
      forward.x *
        layout.behind +
      right.x *
        layout.lateral,

    y:
      predicted.y -
      forward.y *
        layout.behind +
      right.y *
        layout.lateral,
  };
}

function stagingSlotAt(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  secondsAhead:
    number,
) {
  const predicted =
    predictedPositionAt(
      simulation,
      secondsAhead,
    );

  const heading =
    predictedHeadingAt(
      simulation,
      secondsAhead,
    );

  const forward =
    headingVector(
      heading,
    );

  const right =
    headingVector(
      heading +
        90,
    );

  const distance =
    simulation.desiredSeparationMeters;

  const layouts = [
    {
      behind:
        distance *
        2.15,

      lateral:
        -distance *
        0.82,
    },

    {
      behind:
        distance *
        2.15,

      lateral:
        distance *
        0.82,
    },

    {
      behind:
        distance *
        2.55,

      lateral:
        -distance *
        1.18,
    },

    {
      behind:
        distance *
        2.55,

      lateral:
        distance *
        1.18,
    },
  ];

  const layout =
    layouts[
      interceptor.formationSlot
    ] ??
    layouts[
      0
    ];

  if (
    !layout
  ) {
    return predicted;
  }

  return {
    x:
      predicted.x -
      forward.x *
        layout.behind +
      right.x *
        layout.lateral,

    y:
      predicted.y -
      forward.y *
        layout.behind +
      right.y *
        layout.lateral,
  };
}

function pursuitCapturePoint(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  horizon:
    number,
) {
  const predicted =
    predictedPositionAt(
      simulation,
      horizon,
    );

  const heading =
    predictedHeadingAt(
      simulation,
      horizon,
    );

  const forward =
    headingVector(
      heading,
    );

  const right =
    headingVector(
      heading +
        90,
    );

  const side =
    interceptor.formationSlot %
      2 ===
    0
      ? -1
      : 1;

  const aft =
    Math.max(
      simulation.desiredSeparationMeters *
        1.65,
      simulation.minimumSeparationMeters +
        270,
    );

  const lateral =
    120 +
    Math.floor(
      interceptor.formationSlot /
        2,
    ) *
      65;

  return {
    x:
      predicted.x -
      forward.x *
        aft +
      right.x *
        side *
        lateral,

    y:
      predicted.y -
      forward.y *
        aft +
      right.y *
        side *
        lateral,
  };
}

/* =========================================================
   Locked Intercept Planner
   ========================================================= */

function lockInterceptSolution(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  let selectedPoint =
    pursuitCapturePoint(
      simulation,
      interceptor,
      26,
    );

  let selectedHorizon =
    26;

  for (
    const horizon of
    LEAD_SEARCH_HORIZONS
  ) {
    const candidate =
      pursuitCapturePoint(
        simulation,
        interceptor,
        horizon,
      );

    const requiredDistance =
      distanceBetween(
        interceptor,
        candidate,
      );

    const headingError =
      Math.abs(
        normalizeSignedAngle(
          bearingBetween(
            interceptor,
            candidate,
          ) -
            interceptor.heading,
        ),
      );

    const turnPenalty =
      clamp(
        1 -
          headingError /
            270,
        0.5,
        1,
      );

    const availableDistance =
      interceptor.speedLimitMps *
      horizon *
      turnPenalty *
      0.84;

    selectedPoint =
      candidate;

    selectedHorizon =
      horizon;

    if (
      requiredDistance <=
      availableDistance
    ) {
      break;
    }
  }

  interceptor.lockedInterceptPoint =
    selectedPoint;

  interceptor.lockedLeadSeconds =
    selectedHorizon;

  interceptor.lockExpiresAt =
    simulation.simTimeSeconds +
    INTERCEPT_REPLAN_SECONDS;

  interceptor.guidanceLocked =
    true;
}

/* =========================================================
   Safety
   ========================================================= */

function dynamicRecoveryDistance(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  const closingRate =
    Math.max(
      0,
      calculateClosingRate(
        simulation.intruder,
        interceptor,
      ),
    );

  return (
    simulation.minimumSeparationMeters +
    clamp(
      32 +
        closingRate *
          0.75,
      45,
      72,
    )
  );
}

function tangentRecoveryTarget(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  const radial =
    bearingBetween(
      simulation.intruder,
      interceptor,
    );

  const tangentA =
    normalizeHeading(
      radial +
        90,
    );

  const tangentB =
    normalizeHeading(
      radial -
        90,
    );

  const tangentHeading =
    Math.abs(
      normalizeSignedAngle(
        tangentA -
        interceptor.heading,
      ),
    ) <=
    Math.abs(
      normalizeSignedAngle(
        tangentB -
        interceptor.heading,
      ),
    )
      ? tangentA
      : tangentB;

  const tangent =
    headingVector(
      tangentHeading,
    );

  const outward =
    headingVector(
      radial,
    );

  return {
    x:
      interceptor.x +
      tangent.x *
        560 +
      outward.x *
        240,

    y:
      interceptor.y +
      tangent.y *
        560 +
      outward.y *
        240,
  };
}

function enforceHardTargetSeparation(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  const hardRadius =
    simulation.minimumSeparationMeters +
    HARD_SAFETY_MARGIN;

  const separation =
    distanceBetween(
      simulation.intruder,
      interceptor,
    );

  if (
    separation >=
    hardRadius
  ) {
    return;
  }

  let dx =
    interceptor.x -
    simulation.intruder.x;

  let dy =
    interceptor.y -
    simulation.intruder.y;

  let magnitude =
    Math.hypot(
      dx,
      dy,
    );

  if (
    magnitude <
    0.001
  ) {
    const fallback =
      headingVector(
        interceptor.heading +
          180,
      );

    dx =
      fallback.x;

    dy =
      fallback.y;

    magnitude =
      1;
  }

  const unitX =
    dx /
    magnitude;

  const unitY =
    dy /
    magnitude;

  interceptor.x =
    simulation.intruder.x +
    unitX *
      hardRadius;

  interceptor.y =
    simulation.intruder.y +
    unitY *
      hardRadius;

  interceptor.airspeed =
    Math.min(
      interceptor.airspeed,
      simulation.intruder
        .airspeed +
        2,
    );

  interceptor.targetAirspeed =
    Math.min(
      interceptor.targetAirspeed,
      simulation.intruder
        .airspeed +
        1,
    );

  interceptor.status =
    "RECOVERY";

  interceptor.mode =
    "HARD SAFETY";

  interceptor.guidanceLocked =
    false;
}

function applyFleetAvoidance(
  interceptor:
    InternalInterceptor,

  interceptors:
    InternalInterceptor[],

  target:
    Vector2,
) {
  let x =
    target.x;

  let y =
    target.y;

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
        180
      ) {
        return;
      }

      const away =
        headingVector(
          bearingBetween(
            other,
            interceptor,
          ),
        );

      const strength =
        (
          180 -
          separation
        ) *
        1.7;

      x +=
        away.x *
        strength;

      y +=
        away.y *
        strength;
    },
  );

  return {
    x,
    y,
  };
}

function enforceFleetHardSeparation(
  simulation:
    InternalSimulation,
) {
  for (
    let firstIndex =
      0;

    firstIndex <
      simulation.interceptors.length;

    firstIndex +=
      1
  ) {
    for (
      let secondIndex =
        firstIndex +
        1;

      secondIndex <
        simulation.interceptors.length;

      secondIndex +=
        1
    ) {
      const first =
        simulation.interceptors[
          firstIndex
        ];

      const second =
        simulation.interceptors[
          secondIndex
        ];

      if (
        !first ||
        !second
      ) {
        continue;
      }

      const dx =
        second.x -
        first.x;

      const dy =
        second.y -
        first.y;

      let separation =
        Math.hypot(
          dx,
          dy,
        );

      if (
        separation >=
        FLEET_MINIMUM_SEPARATION
      ) {
        continue;
      }

      separation =
        Math.max(
          separation,
          0.001,
        );

      const unitX =
        dx /
        separation;

      const unitY =
        dy /
        separation;

      const correction =
        (
          FLEET_MINIMUM_SEPARATION -
          separation
        ) /
        2;

      first.x -=
        unitX *
        correction;

      first.y -=
        unitY *
        correction;

      second.x +=
        unitX *
        correction;

      second.y +=
        unitY *
        correction;
    }
  }

  simulation.interceptors.forEach(
    (
      interceptor,
    ) =>
      enforceHardTargetSeparation(
        simulation,
        interceptor,
      ),
  );
}

/* =========================================================
   Patrol / Tracking Helpers
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

  return {
    x:
      interceptor.station.x +
      Math.cos(
        angle,
      ) *
        130,

    y:
      interceptor.station.y +
      Math.sin(
        angle,
      ) *
        130,
  };
}

function headingAlignmentError(
  first:
    AircraftState,

  second:
    AircraftState,
) {
  return Math.abs(
    normalizeSignedAngle(
      first.heading -
        second.heading,
    ),
  );
}

function expectedLaneSign(
  interceptor:
    InternalInterceptor,
) {
  return (
    interceptor.formationSlot %
      2 ===
    0
  )
    ? -1
    : 1;
}

function isCorrectApproachLane(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,
) {
  const relative =
    relativeTargetCoordinates(
      simulation.intruder,
      interceptor,
    );

  const side =
    expectedLaneSign(
      interceptor,
    );

  const isBehind =
    relative.forward <
    -simulation.desiredSeparationMeters *
      1.15;

  const sideCorrect =
    side <
    0
      ? relative.right <
        -45
      : relative.right >
        45;

  return (
    isBehind &&
    sideCorrect
  );
}

/* =========================================================
   Moving Slot Tracking
   ========================================================= */

function stepMovingSlotTracking(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  target:
    Vector2,

  deltaSeconds:
    number,

  phase:
    "STAGING" |
    "RENDEZVOUS" |
    "SHADOW",
) {
  const errorX =
    target.x -
    interceptor.x;

  const errorY =
    target.y -
    interceptor.y;

  const errorMagnitude =
    Math.max(
      0.001,
      Math.hypot(
        errorX,
        errorY,
      ),
    );

  const gain =
    phase ===
    "STAGING"
      ? 0.045
      : phase ===
          "RENDEZVOUS"
        ? 0.07
        : 0.05;

  const maxCorrection =
    phase ===
    "STAGING"
      ? 12
      : phase ===
          "RENDEZVOUS"
        ? 10
        : 7;

  const correctionMagnitude =
    Math.min(
      errorMagnitude *
        gain,
      maxCorrection,
    );

  const correctionX =
    (
      errorX /
      errorMagnitude
    ) *
    correctionMagnitude;

  const correctionY =
    (
      errorY /
      errorMagnitude
    ) *
    correctionMagnitude;

  const intruderVelocity =
    velocityVector(
      simulation.intruder,
    );

  const relativeX =
    target.x -
    simulation.intruder.x;

  const relativeY =
    target.y -
    simulation.intruder.y;

  const omega =
    toRadians(
      simulation.intruder
        .turnRate,
    );

  const rotationVelocityX =
    omega *
    relativeY;

  const rotationVelocityY =
    -omega *
    relativeX;

  const desiredVelocityX =
    intruderVelocity.x +
    rotationVelocityX +
    correctionX;

  const desiredVelocityY =
    intruderVelocity.y +
    rotationVelocityY +
    correctionY;

  const desiredHeading =
    normalizeHeading(
      toDegrees(
        Math.atan2(
          desiredVelocityX,
          desiredVelocityY,
        ),
      ),
    );

  let desiredSpeed =
    Math.hypot(
      desiredVelocityX,
      desiredVelocityY,
    );

  if (
    phase ===
    "STAGING"
  ) {
    desiredSpeed =
      clamp(
        desiredSpeed,
        simulation.intruder
          .airspeed -
          1,
        simulation.intruder
          .airspeed +
          9,
      );
  }

  if (
    phase ===
    "RENDEZVOUS"
  ) {
    desiredSpeed =
      clamp(
        desiredSpeed,
        simulation.intruder
          .airspeed -
          2,
        simulation.intruder
          .airspeed +
          4,
      );
  }

  if (
    phase ===
    "SHADOW"
  ) {
    desiredSpeed =
      clamp(
        desiredSpeed,
        simulation.intruder
          .airspeed -
          3,
        simulation.intruder
          .airspeed +
          3,
      );
  }

  interceptor.targetAirspeed =
    clamp(
      desiredSpeed,
      18,
      interceptor.speedLimitMps,
    );

  stepFixedWingToHeading(
    interceptor,
    desiredHeading,
    interceptor.targetAirspeed,
    interceptor.speedLimitMps,
    deltaSeconds,
    phase ===
      "STAGING"
      ? 38
      : 34,
  );
}

/* =========================================================
   Phase Speed Policy
   ========================================================= */

function pursuitSpeedCommand(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  target:
    Vector2,
) {
  const distance =
    distanceBetween(
      interceptor,
      target,
    );

  let margin =
    8;

  if (
    distance >
    1200
  ) {
    margin =
      42;
  } else if (
    distance >
    900
  ) {
    margin =
      34;
  } else if (
    distance >
    650
  ) {
    margin =
      27;
  } else if (
    distance >
    450
  ) {
    margin =
      20;
  } else if (
    distance >
    300
  ) {
    margin =
      14;
  }

  let speed =
    simulation.intruder
      .airspeed +
    margin;

  if (
    simulation.adaptiveSpeedSync
  ) {
    const closing =
      Math.max(
        0,
        calculateClosingRate(
          simulation.intruder,
          interceptor,
        ),
      );

    speed -=
      clamp(
        closing *
          0.35,
        0,
        8,
      );
  }

  return clamp(
    speed,
    20,
    interceptor.speedLimitMps,
  );
}

/* =========================================================
   ETA Smoothing
   ========================================================= */

function updateEta(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  target:
    Vector2,
) {
  const remaining =
    distanceBetween(
      interceptor,
      target,
    );

  let effectiveClosure =
    8;

  if (
    interceptor.status ===
    "PURSUIT"
  ) {
    effectiveClosure =
      Math.max(
        10,
        interceptor.targetAirspeed -
          simulation.intruder
            .airspeed *
            0.35,
      );
  } else {
    effectiveClosure =
      Math.max(
        6,
        Math.abs(
          interceptor.targetAirspeed -
            simulation.intruder
              .airspeed,
        ) +
          6,
      );
  }

  const rawEta =
    clamp(
      remaining /
        effectiveClosure,
      0,
      300,
    );

  interceptor.etaSeconds =
    interceptor.etaSeconds ===
    null
      ? rawEta
      : interceptor.etaSeconds +
        clamp(
          rawEta -
            interceptor.etaSeconds,
          -0.4,
          0.4,
        );
}

/* =========================================================
   Recovery
   ========================================================= */

function updateRecovery(
  simulation:
    InternalSimulation,

  interceptor:
    InternalInterceptor,

  deltaSeconds:
    number,

  targets:
    Record<
      number,
      Vector2
    >,
) {
  const target =
    tangentRecoveryTarget(
      simulation,
      interceptor,
    );

  targets[
    interceptor.id
  ] =
    target;

  interceptor.status =
    "RECOVERY";

  interceptor.mode =
    "SAFETY RECOVERY";

  interceptor.guidanceLocked =
    false;

  interceptor.lockedInterceptPoint =
    null;

  interceptor.targetAirspeed =
    clamp(
      simulation.intruder
        .airspeed +
        1,
      18,
      Math.min(
        36,
        interceptor.speedLimitMps,
      ),
    );

  stepFixedWingToPoint(
    interceptor,
    target,
    interceptor.targetAirspeed,
    interceptor.speedLimitMps,
    deltaSeconds,
    42,
  );

  enforceHardTargetSeparation(
    simulation,
    interceptor,
  );

  const separation =
    distanceBetween(
      simulation.intruder,
      interceptor,
    );

  const closingRate =
    calculateClosingRate(
      simulation.intruder,
      interceptor,
    );

  const recoveryDistance =
    dynamicRecoveryDistance(
      simulation,
      interceptor,
    );

  const minimumRecoveryDwell =
    simulation.simTimeSeconds -
      interceptor.recoveryEnteredAt >=
    1;

  const clear =
    minimumRecoveryDwell &&
    separation >
      recoveryDistance +
        40 &&
    closingRate <=
      1.5;

  interceptor.recoveryClearSeconds =
    clear
      ? interceptor.recoveryClearSeconds +
        deltaSeconds
      : 0;

  if (
    interceptor.recoveryClearSeconds >=
    RECOVERY_CLEAR_HOLD_SECONDS
  ) {
    interceptor.recoveryClearSeconds =
      0;

    interceptor.pursuitStableSeconds =
      0;

    interceptor.stagingStableSeconds =
      0;

    interceptor.slotStableSeconds =
      0;

    interceptor.shadowBreakSeconds =
      0;

    interceptor.status =
      separation >
      1050
        ? "PURSUIT"
        : "STAGING";

    interceptor.mode =
      interceptor.status ===
      "PURSUIT"
        ? "AI PURSUIT · ACQUIRING LOCK"
        : "AI STAGING";
  }
}

/* =========================================================
   Interceptor State Machine
   ========================================================= */

function updateInterceptors(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  const targets:
    Record<
      number,
      Vector2
    > = {};

  simulation.interceptors.forEach(
    (
      interceptor,
    ) => {
      /* -----------------------------------------------------
         RTL / ABORT
         ----------------------------------------------------- */

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

        interceptor.guidanceLocked =
          false;

        interceptor.targetAirspeed =
          Math.min(
            interceptor.speedLimitMps,
            34,
          );

        interceptor.slotErrorMeters =
          null;

        interceptor.etaSeconds =
          null;

        stepFixedWingToPoint(
          interceptor,
          interceptor.station,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          35,
        );

        return;
      }

      /* -----------------------------------------------------
         HOLD
         ----------------------------------------------------- */

      if (
        simulation.mode ===
        "HOLD"
      ) {
        interceptor.status =
          "HOLD";

        interceptor.mode =
          "HOLD";

        interceptor.guidanceLocked =
          false;

        interceptor.targetAirspeed =
          25;

        interceptor.slotErrorMeters =
          null;

        interceptor.etaSeconds =
          null;

        stepFixedWingToPoint(
          interceptor,
          patrolTarget(
            simulation,
            interceptor,
          ),
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          28,
        );

        return;
      }

      /* -----------------------------------------------------
         PATROL
         ----------------------------------------------------- */

      if (
        !simulation.interceptAuthorized
      ) {
        interceptor.assigned =
          false;

        interceptor.status =
          "PATROL";

        interceptor.mode =
          "PATROL";

        interceptor.guidanceLocked =
          false;

        interceptor.targetAirspeed =
          24;

        interceptor.slotErrorMeters =
          null;

        interceptor.etaSeconds =
          null;

        stepFixedWingToPoint(
          interceptor,
          patrolTarget(
            simulation,
            interceptor,
          ),
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          28,
        );

        return;
      }

      interceptor.assigned =
        true;

      /* -----------------------------------------------------
         Safety pre-emption
         ----------------------------------------------------- */

      const separation =
        distanceBetween(
          simulation.intruder,
          interceptor,
        );

      const recoveryRadius =
        dynamicRecoveryDistance(
          simulation,
          interceptor,
        );

      const closestApproach =
        predictClosestApproach(
          simulation.intruder,
          interceptor,
          4,
        );

      const hardRadius =
        simulation.minimumSeparationMeters +
        HARD_SAFETY_MARGIN;

      const predictiveRecovery =
        separation <
          recoveryRadius +
            70 &&
        closestApproach <
          hardRadius +
            18;

      const recoveryRequired =
        separation <
          recoveryRadius ||
        predictiveRecovery;

      if (
        recoveryRequired &&
        interceptor.status !==
          "RECOVERY"
      ) {
        interceptor.status =
          "RECOVERY";

        interceptor.recoveryEnteredAt =
          simulation.simTimeSeconds;

        interceptor.recoveryClearSeconds =
          0;
      }

      if (
        interceptor.status ===
        "RECOVERY"
      ) {
        updateRecovery(
          simulation,
          interceptor,
          deltaSeconds,
          targets,
        );

        return;
      }

      /* -----------------------------------------------------
         Initial transition after dispatch
         ----------------------------------------------------- */

      if (
        interceptor.status ===
          "PATROL" ||
        interceptor.status ===
          "HOLD" ||
        interceptor.status ===
          "RTL"
      ) {
        interceptor.status =
          "PURSUIT";

        interceptor.mode =
          "AI PURSUIT · ACQUIRING LOCK";

        interceptor.lockedInterceptPoint =
          null;

        interceptor.guidanceLocked =
          false;

        interceptor.pursuitStableSeconds =
          0;

        interceptor.stagingStableSeconds =
          0;

        interceptor.slotStableSeconds =
          0;

        interceptor.shadowBreakSeconds =
          0;
      }

      let guidanceTarget:
        Vector2;

      /* -----------------------------------------------------
         PURSUIT
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "PURSUIT"
      ) {
        const needsLock =
          interceptor.lockedInterceptPoint ===
            null ||
          simulation.simTimeSeconds >=
            interceptor.lockExpiresAt;

        if (
          needsLock
        ) {
          lockInterceptSolution(
            simulation,
            interceptor,
          );
        }

        const lockedTarget =
          interceptor.lockedInterceptPoint ??
          pursuitCapturePoint(
            simulation,
            interceptor,
            12,
          );

        guidanceTarget =
          lockedTarget;

        interceptor.guidanceLocked =
          true;

        interceptor.mode =
          "AI PURSUIT · LOCKED";

        interceptor.slotErrorMeters =
          null;

        const targetError =
          distanceBetween(
            interceptor,
            lockedTarget,
          );

        const transitionCondition =
          separation <=
            PURSUIT_CAPTURE_RANGE &&
          targetError <=
            PURSUIT_CAPTURE_POINT_ERROR;

        interceptor.pursuitStableSeconds =
          transitionCondition
            ? interceptor.pursuitStableSeconds +
              deltaSeconds
            : Math.max(
                0,
                interceptor.pursuitStableSeconds -
                  deltaSeconds *
                    0.5,
              );

        if (
          interceptor.pursuitStableSeconds >=
          PURSUIT_CAPTURE_HOLD_SECONDS
        ) {
          interceptor.status =
            "STAGING";

          interceptor.mode =
            "AI STAGING";

          interceptor.guidanceLocked =
            false;

          interceptor.lockedInterceptPoint =
            null;

          interceptor.stagingStableSeconds =
            0;

          interceptor.pursuitStableSeconds =
            0;
        }
      }

      /* -----------------------------------------------------
         STAGING

         High-speed pursuit ends here.

         Must:
         - get behind intruder
         - enter correct left/right lane
         - match speed
         - align heading
         - prove final turn is feasible
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "STAGING"
      ) {
        guidanceTarget =
          stagingSlotAt(
            simulation,
            interceptor,
            0.6,
          );

        interceptor.mode =
          "AI STAGING";

        interceptor.guidanceLocked =
          false;

        interceptor.slotErrorMeters =
          distanceBetween(
            interceptor,
            guidanceTarget,
          );

        const headingError =
          headingAlignmentError(
            interceptor,
            simulation.intruder,
          );

        const speedDelta =
          Math.abs(
            interceptor.airspeed -
              simulation.intruder
                .airspeed,
          );

        const correctLane =
          isCorrectApproachLane(
            simulation,
            interceptor,
          );

        const finalSlot =
          finalShadowSlotAt(
            simulation,
            interceptor,
            0.8,
          );

        const finalTurnFeasible =
          turnToPointFeasible(
            interceptor,
            finalSlot,
            34,
          );

        const safeSeparation =
          separation >=
          hardRadius +
            45;

        const stagingReady =
          interceptor.slotErrorMeters <=
            STAGING_POSITION_TOLERANCE &&
          headingError <=
            STAGING_HEADING_TOLERANCE &&
          speedDelta <=
            STAGING_SPEED_TOLERANCE &&
          correctLane &&
          finalTurnFeasible &&
          safeSeparation;

        interceptor.stagingStableSeconds =
          stagingReady
            ? interceptor.stagingStableSeconds +
              deltaSeconds
            : Math.max(
                0,
                interceptor.stagingStableSeconds -
                  deltaSeconds *
                    0.6,
              );

        if (
          interceptor.stagingStableSeconds >=
          STAGING_HOLD_SECONDS
        ) {
          interceptor.status =
            "RENDEZVOUS";

          interceptor.mode =
            "AI RENDEZVOUS";

          interceptor.slotStableSeconds =
            0;

          interceptor.stagingStableSeconds =
            0;
        }
      }

      /* -----------------------------------------------------
         RENDEZVOUS

         No high catch-up speed anymore.
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "RENDEZVOUS"
      ) {
        guidanceTarget =
          finalShadowSlotAt(
            simulation,
            interceptor,
            0.35,
          );

        interceptor.mode =
          "AI RENDEZVOUS";

        interceptor.guidanceLocked =
          false;

        interceptor.slotErrorMeters =
          distanceBetween(
            interceptor,
            guidanceTarget,
          );

        const headingError =
          headingAlignmentError(
            interceptor,
            simulation.intruder,
          );

        const speedDelta =
          Math.abs(
            interceptor.airspeed -
              simulation.intruder
                .airspeed,
          );

        const correctLane =
          isCorrectApproachLane(
            simulation,
            interceptor,
          );

        const captured =
          interceptor.slotErrorMeters <=
            SLOT_CAPTURE_TOLERANCE &&
          headingError <=
            SLOT_HEADING_TOLERANCE &&
          speedDelta <=
            SLOT_SPEED_TOLERANCE &&
          correctLane &&
          separation >
            hardRadius +
              35;

        interceptor.slotStableSeconds =
          captured
            ? interceptor.slotStableSeconds +
              deltaSeconds
            : Math.max(
                0,
                interceptor.slotStableSeconds -
                  deltaSeconds *
                    0.5,
              );

        if (
          interceptor.slotStableSeconds >=
          SLOT_CAPTURE_HOLD_SECONDS
        ) {
          interceptor.status =
            "SHADOW";

          interceptor.mode =
            "AI SHADOW";

          interceptor.shadowBreakSeconds =
            0;
        }
      }

      /* -----------------------------------------------------
         SHADOW
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "SHADOW"
      ) {
        guidanceTarget =
          finalShadowSlotAt(
            simulation,
            interceptor,
            0,
          );

        interceptor.mode =
          "AI SHADOW";

        interceptor.guidanceLocked =
          false;

        interceptor.slotErrorMeters =
          distanceBetween(
            interceptor,
            guidanceTarget,
          );

        const headingError =
          headingAlignmentError(
            interceptor,
            simulation.intruder,
          );

        const speedDelta =
          Math.abs(
            interceptor.airspeed -
              simulation.intruder
                .airspeed,
          );

        const broken =
          interceptor.slotErrorMeters >
            SLOT_BREAK_TOLERANCE ||
          headingError >
            24 ||
          speedDelta >
            9;

        interceptor.shadowBreakSeconds =
          broken
            ? interceptor.shadowBreakSeconds +
              deltaSeconds
            : Math.max(
                0,
                interceptor.shadowBreakSeconds -
                  deltaSeconds,
              );

        if (
          interceptor.shadowBreakSeconds >=
          SHADOW_BREAK_HOLD_SECONDS
        ) {
          /*
           * Do not send it directly back to aggressive pursuit.
           * Re-enter the staging corridor instead.
           */
          interceptor.status =
            "STAGING";

          interceptor.mode =
            "AI STAGING";

          interceptor.stagingStableSeconds =
            0;

          interceptor.slotStableSeconds =
            0;

          interceptor.shadowBreakSeconds =
            0;
        }
      }

      /* -----------------------------------------------------
         Resolve current target after possible phase changes
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "PURSUIT"
      ) {
        guidanceTarget =
          interceptor.lockedInterceptPoint ??
          pursuitCapturePoint(
            simulation,
            interceptor,
            12,
          );
      } else if (
        interceptor.status ===
        "STAGING"
      ) {
        guidanceTarget =
          stagingSlotAt(
            simulation,
            interceptor,
            0.6,
          );
      } else if (
        interceptor.status ===
        "RENDEZVOUS"
      ) {
        guidanceTarget =
          finalShadowSlotAt(
            simulation,
            interceptor,
            0.35,
          );
      } else {
        guidanceTarget =
          finalShadowSlotAt(
            simulation,
            interceptor,
            0,
          );
      }

      const safeGuidanceTarget =
        applyFleetAvoidance(
          interceptor,
          simulation.interceptors,
          guidanceTarget,
        );

      targets[
        interceptor.id
      ] =
        safeGuidanceTarget;

      /* -----------------------------------------------------
         Execute phase-specific guidance
         ----------------------------------------------------- */

      if (
        interceptor.status ===
        "PURSUIT"
      ) {
        interceptor.targetAirspeed =
          pursuitSpeedCommand(
            simulation,
            interceptor,
            safeGuidanceTarget,
          );

        stepFixedWingToPoint(
          interceptor,
          safeGuidanceTarget,
          interceptor.targetAirspeed,
          interceptor.speedLimitMps,
          deltaSeconds,
          42,
        );
      } else if (
        interceptor.status ===
        "STAGING"
      ) {
        stepMovingSlotTracking(
          simulation,
          interceptor,
          safeGuidanceTarget,
          deltaSeconds,
          "STAGING",
        );
      } else if (
        interceptor.status ===
        "RENDEZVOUS"
      ) {
        stepMovingSlotTracking(
          simulation,
          interceptor,
          safeGuidanceTarget,
          deltaSeconds,
          "RENDEZVOUS",
        );
      } else {
        stepMovingSlotTracking(
          simulation,
          interceptor,
          safeGuidanceTarget,
          deltaSeconds,
          "SHADOW",
        );
      }

      updateEta(
        simulation,
        interceptor,
        safeGuidanceTarget,
      );

      enforceHardTargetSeparation(
        simulation,
        interceptor,
      );
    },
  );

  enforceFleetHardSeparation(
    simulation,
  );

  simulation.formationTargets =
    targets;
}

/* =========================================================
   Fleet State
   ========================================================= */

function updateFleetPhase(
  simulation:
    InternalSimulation,

  deltaSeconds:
    number,
) {
  if (
    simulation.mode ===
      "RTL" ||
    simulation.mode ===
      "ABORT"
  ) {
    simulation.fleetPhase =
      "RTL";

    simulation.fleetStableSeconds =
      0;

    return;
  }

  if (
    !simulation.interceptAuthorized
  ) {
    simulation.fleetPhase =
      "STANDBY";

    simulation.fleetStableSeconds =
      0;

    return;
  }

  const statuses =
    simulation.interceptors.map(
      (
        interceptor,
      ) =>
        interceptor.status,
    );

  if (
    statuses.some(
      (
        status,
      ) =>
        status ===
        "RECOVERY",
    )
  ) {
    simulation.fleetPhase =
      "RECOVERY";

    simulation.fleetStableSeconds =
      0;

    return;
  }

  if (
    statuses.every(
      (
        status,
      ) =>
        status ===
        "SHADOW",
    )
  ) {
    simulation.fleetPhase =
      "FORMATION";

    simulation.fleetStableSeconds +=
      deltaSeconds;

    if (
      simulation.fleetStableSeconds >=
      FLEET_STABLE_HOLD_SECONDS
    ) {
      simulation.fleetPhase =
        "SHADOW";

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
          "NON-CONTACT INTERCEPT ESTABLISHED",

        message:
          "All four interceptor UAVs remained stable in their assigned shadow slots.",
      };
    }

    return;
  }

  simulation.fleetStableSeconds =
    0;

  if (
    statuses.some(
      (
        status,
      ) =>
        status ===
        "PURSUIT",
    )
  ) {
    simulation.fleetPhase =
      "PURSUIT";

    return;
  }

  if (
    statuses.some(
      (
        status,
      ) =>
        status ===
        "STAGING",
    )
  ) {
    simulation.fleetPhase =
      "STAGING";

    return;
  }

  if (
    statuses.some(
      (
        status,
      ) =>
        status ===
        "RENDEZVOUS",
    )
  ) {
    simulation.fleetPhase =
      "RENDEZVOUS";

    return;
  }

  simulation.fleetPhase =
    "FORMATION";
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

  simulation.intruderTrail.push(
    {
      x:
        simulation.intruder.x,

      y:
        simulation.intruder.y,
    },
  );

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

      trail.push(
        {
          x:
            interceptor.x,

          y:
            interceptor.y,
        },
      );

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
   AI Module Telemetry
   ========================================================= */

function buildAiModules(
  simulation:
    InternalSimulation,

  cvError:
    number | null,

  ctrvError:
    number | null,

  learnedError:
    number | null,

  weights:
    PredictorWeights,

  validation:
    MlValidationState,
): AiModuleState[] {
  const mlState:
    AiModuleState["state"] =
    validation.status ===
    "VALIDATED"
      ? "ACTIVE"
      : validation.status ===
          "REJECTED"
        ? "REJECTED"
        : simulation.neuralModel
              .sampleCount >
            0
          ? "LEARNING"
          : "WARMING";

  return [
    {
      id:
        "estimator",

      label:
        "State Estimator",

      category:
        "ALGORITHM",

      state:
        "ACTIVE",

      detail:
        "Position · airspeed · heading · bank · coordinated-turn state",
    },

    {
      id:
        "cv",

      label:
        "CV Baseline",

      category:
        "ALGORITHM",

      state:
        "ACTIVE",

      detail:
        cvError ===
        null
          ? "Collecting validation samples"
          : `${cvError.toFixed(
              1,
            )} m rolling error`,
    },

    {
      id:
        "ctrv",

      label:
        "CTRV Turn Predictor",

      category:
        "ALGORITHM",

      state:
        "ACTIVE",

      detail:
        ctrvError ===
        null
          ? "Turn-aware predictor warming"
          : `${ctrvError.toFixed(
              1,
            )} m rolling error`,
    },

    {
      id:
        "mlp",

      label:
        "Online Residual MLP",

      category:
        "ML",

      state:
        mlState,

      detail:
        learnedError ===
        null
          ? `8→10→2 residual network · ${simulation.neuralModel.sampleCount} trained samples`
          : `8→10→2 residual network · ${simulation.neuralModel.sampleCount} samples · ${learnedError.toFixed(
              1,
            )} m rolling error`,
    },

    {
      id:
        "gate",

      label:
        "ML Validation Gate",

      category:
        "ML",

      state:
        mlState,

      detail:
        validation.reason,
    },

    {
      id:
        "ensemble",

      label:
        "Bounded Predictor Ensemble",

      category:
        "ML",

      state:
        validation.status ===
        "VALIDATED"
          ? "ACTIVE"
          : "WARMING",

      detail:
        `CV ${Math.round(
          weights.cv *
            100,
        )}% · CTRV ${Math.round(
          weights.ctrv *
            100,
        )}% · MLP ${Math.round(
          weights.learned *
            100,
        )}%`,
    },

    {
      id:
        "lead",

      label:
        "Locked Lead Planner",

      category:
        "ALGORITHM",

      state:
        simulation.interceptAuthorized
          ? "ACTIVE"
          : "STANDBY",

      detail:
        "Searches feasible future capture points and locks the solution between replans.",
    },

    {
      id:
        "curvature",

      label:
        "Turn-Feasibility Planner",

      category:
        "ALGORITHM",

      state:
        simulation.interceptAuthorized
          ? "ACTIVE"
          : "STANDBY",

      detail:
        "Uses bank, airspeed and minimum turn radius before commanding approach geometry.",
    },

    {
      id:
        "staging",

      label:
        "Aft Staging Gate",

      category:
        "ALGORITHM",

      state:
        simulation.interceptAuthorized
          ? "ACTIVE"
          : "STANDBY",

      detail:
        `Requires aft position, correct lane, ≤${STAGING_HEADING_TOLERANCE}° heading error and ≤${STAGING_SPEED_TOLERANCE} m/s speed delta before rendezvous.`,
    },

    {
      id:
        "safety",

      label:
        "Deterministic Safety Barrier",

      category:
        "ALGORITHM",

      state:
        "ACTIVE",

      detail:
        `${simulation.minimumSeparationMeters + HARD_SAFETY_MARGIN} m hard non-contact barrier`,
    },
  ];
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

  const nearest =
    separations.length >
    0
      ? Math.min(
          ...separations,
        )
      : null;

  const nearestIndex =
    nearest ===
    null
      ? -1
      : separations.indexOf(
          nearest,
        );

  const nearestInterceptor =
    nearestIndex >=
    0
      ? simulation.interceptors[
          nearestIndex
        ]
      : undefined;

  const closingRate =
    simulation.interceptAuthorized &&
    nearestInterceptor
      ? calculateClosingRate(
          simulation.intruder,
          nearestInterceptor,
        )
      : null;

  const closestApproaches =
    simulation.interceptAuthorized
      ? simulation.interceptors.map(
          (
            interceptor,
          ) =>
            predictClosestApproach(
              simulation.intruder,
              interceptor,
              6,
            ),
        )
      : [];

  const predictedClosest =
    closestApproaches.length >
    0
      ? Math.min(
          ...closestApproaches,
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

  const validation =
    evaluateMlValidation(
      simulation.errors,
      simulation.neuralModel
        .sampleCount,
    );

  const weights =
    predictorWeights(
      simulation.errors,
      simulation.neuralModel
        .sampleCount,
    );

  const validationSamples =
    simulation.errors.adaptive
      .length;

  const adaptiveImprovement =
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

  const selectedPredictor:
    | "CV"
    | "CTRV"
    | "ADAPTIVE" =
    simulation.predictorMode ===
    "baseline"
      ? "CV"
      : weights.learned >
          0
        ? "ADAPTIVE"
        : weights.ctrv >=
            weights.cv
          ? "CTRV"
          : "CV";

  const confidence =
    validation.status ===
      "VALIDATED" &&
    validation.improvementPercent !==
      null
      ? clamp(
          0.55 +
            clamp(
              validation.improvementPercent /
                30,
              0,
              1,
            ) *
              0.2 +
            clamp(
              validationSamples /
                40,
              0,
              1,
            ) *
              0.15,
          0,
          0.9,
        )
      : 0;

  const etaValues =
    simulation.interceptors
      .filter(
        (
          interceptor,
        ) =>
          interceptor.assigned &&
          interceptor.etaSeconds !==
            null,
      )
      .map(
        (
          interceptor,
        ) =>
          interceptor.etaSeconds as number,
      );

  const eta =
    etaValues.length >
    0
      ? Math.max(
          ...etaValues,
        )
      : null;

  return {
    running:
      simulation.running,

    mode:
      simulation.mode,

    fleetPhase:
      simulation.fleetPhase,

    fleetStableSeconds:
      simulation.fleetStableSeconds,

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

    nearestSeparationMeters:
      simulation.interceptAuthorized
        ? nearest
        : null,

    closingRateMps:
      closingRate,

    etaSeconds:
      eta,

    desiredSeparationMeters:
      simulation.desiredSeparationMeters,

    minimumSeparationMeters:
      simulation.minimumSeparationMeters,

    separationSafe:
      nearest ===
        null ||
      nearest >=
        simulation.minimumSeparationMeters +
          HARD_SAFETY_MARGIN,

    predictedClosestSeparationMeters:
      predictedClosest,

    anticipatorySafetyGate:
      simulation.interceptors.some(
        (
          interceptor,
        ) =>
          interceptor.status ===
          "RECOVERY",
      ),

    mlValidation:
      validation,

    ai: {
      model:
        "CV + CTRV + Validation-Gated Online Residual MLP",

      selectedPredictor,

      confidence,

      predictionHorizonSeconds:
        PREDICTION_HORIZON_SECONDS,

      residualMeters:
        adaptiveError ??
        0,

      ready:
        validation.status ===
        "VALIDATED",

      trainingSamples:
        simulation.neuralModel
          .sampleCount,

      weights,

      modules:
        buildAiModules(
          simulation,
          cvError,
          ctrvError,
          learnedError,
          weights,
          validation,
        ),
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

      improvementPercent:
        adaptiveImprovement,

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

          updateFleetPhase(
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

      return () =>
        cancelAnimationFrame(
          frameId,
        );
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
            220,
            420,
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

        simulation.fleetPhase =
          "PURSUIT";

        simulation.fleetStableSeconds =
          0;

        simulation.interceptors.forEach(
          (
            interceptor,
          ) => {
            interceptor.assigned =
              true;

            interceptor.status =
              "PURSUIT";

            interceptor.mode =
              "AI PURSUIT · ACQUIRING LOCK";

            interceptor.guidanceLocked =
              false;

            interceptor.lockedInterceptPoint =
              null;

            interceptor.pursuitStableSeconds =
              0;

            interceptor.stagingStableSeconds =
              0;

            interceptor.slotStableSeconds =
              0;

            interceptor.shadowBreakSeconds =
              0;

            interceptor.recoveryClearSeconds =
              0;

            interceptor.etaSeconds =
              null;
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
            "Locked predictive interception authorized. Pursuit and curvature-safe staging are active.",
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

        simulationRef.current.fleetPhase =
          "RTL";

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

        simulationRef.current.fleetPhase =
          "RTL";

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
            !simulationRef.current
          ) {
            return;
          }

          simulationRef.current.mode =
            "TRACK";

          publish();
        },

        shadow: () => {
          const simulation =
            simulationRef.current;

          if (
            !simulation ||
            !simulation.interceptAuthorized
          ) {
            return;
          }

          const allShadow =
            simulation.interceptors.every(
              (
                interceptor,
              ) =>
                interceptor.status ===
                "SHADOW",
            );

          if (
            !allShadow
          ) {
            return;
          }

          simulation.mode =
            "SHADOW";

          simulation.fleetPhase =
            "SHADOW";

          publish();
        },

        hold,

        rtl,

        abort,

        idle: () => {
          if (
            !simulationRef.current
          ) {
            return;
          }

          simulationRef.current.mode =
            "IDLE";

          publish();
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