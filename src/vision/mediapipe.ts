import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  ObjectDetector,
} from "@mediapipe/tasks-vision";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

const MODELS = {
  face:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  hand:
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  pose:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  object:
    "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
};

export type VisionBundle = {
  face: FaceLandmarker;
  hand: HandLandmarker;
  pose: PoseLandmarker;
  objectDetector?: ObjectDetector;
};

export type Point = {
  x: number;
  y: number;
  z?: number;
};

export type FrameAnalysis = {
  smile: number;
  anger: number;
  mouthOpen: number;
  handNearHead: boolean;
  bookVisible: boolean;
  hands: Point[];
  handShapes: Array<{
    wrist: Point;
    indexTip: Point;
    thumbTip: Point;
    palm: Point;
    openness: number;
  }>;
  shoulders?: {
    left: {
      x: number;
      y: number;
      visibility: number;
    };
    right: {
      x: number;
      y: number;
      visibility: number;
    };
  };
  torso?: {
    leftShoulder: Point;
    rightShoulder: Point;
    leftHip?: Point;
    rightHip?: Point;
  };
};

export async function createVision(): Promise<VisionBundle> {
  const vision = await FilesetResolver.forVisionTasks(WASM);

  const [face, hand, pose] = await Promise.all([
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODELS.face,
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    }),

    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODELS.hand,
      },
      runningMode: "VIDEO",
      numHands: 2,
    }),

    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODELS.pose,
      },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  ]);

  // Book detection is optional.
  // If it fails to load, the rest of the camera experience still works.
  let objectDetector: ObjectDetector | undefined;

  try {
    objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODELS.object,
      },
      runningMode: "VIDEO",
      scoreThreshold: 0.35,
      maxResults: 3,
    });
  } catch (error) {
    console.warn(
      "Optional book detector unavailable; using hand gesture detection.",
      error
    );
  }

  return {
    face,
    hand,
    pose,
    objectDetector,
  };
}

function score(
  categories: Array<{
    categoryName?: string;
    score?: number;
  }> | undefined,
  name: string
): number {
  return (
    categories?.find((category) => category.categoryName === name)?.score ?? 0
  );
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function analyzeFrame(
  bundle: VisionBundle,
  video: HTMLVideoElement,
  timestamp: number
): FrameAnalysis {
  const faceResult = bundle.face.detectForVideo(video, timestamp);
  const handResult = bundle.hand.detectForVideo(video, timestamp);
  const poseResult = bundle.pose.detectForVideo(video, timestamp);

  // Object detection is optional.
  // If the detector isn't available, this remains undefined.
  const objectResult = bundle.objectDetector?.detectForVideo(
    video,
    timestamp
  );

  // -----------------------------
  // FACE
  // -----------------------------

  const cats = faceResult.faceBlendshapes?.[0]?.categories;

  const smile = Math.max(
    score(cats, "mouthSmileLeft"),
    score(cats, "mouthSmileRight")
  );

  const browDown =
    (score(cats, "browDownLeft") + score(cats, "browDownRight")) / 2;

  const mouthFrown =
    (score(cats, "mouthFrownLeft") + score(cats, "mouthFrownRight")) / 2;

  const anger = Math.min(
    1,
    browDown * 0.7 + mouthFrown * 0.4
  );

  const mouthOpen = Math.max(
    score(cats, "jawOpen"),
    score(cats, "mouthOpen")
  );

  // -----------------------------
  // HANDS
  // -----------------------------

  const handShapes = (handResult.landmarks ?? []).map((raw) => {
    // Mirror X because the visible camera is mirrored.
    const p = (index: number): Point => ({
      x: 1 - raw[index].x,
      y: raw[index].y,
      z: raw[index].z,
    });

    const wrist = p(0);
    const indexTip = p(8);
    const thumbTip = p(4);
    const palm = p(9);

    // Larger value = more open hand.
    // Smaller value = fingers are closer together.
    const openness =
      (dist(p(8), p(5)) +
        dist(p(12), p(9)) +
        dist(p(16), p(13)) +
        dist(p(20), p(17))) /
      4;

    return {
      wrist,
      indexTip,
      thumbTip,
      palm,
      openness,
    };
  });

  const hands = handShapes.map((hand) => hand.wrist);

  // -----------------------------
  // HAND NEAR HEAD
  // -----------------------------

  const face = faceResult.faceLandmarks?.[0];

  const handNearHead = Boolean(
    face &&
      hands.some((wrist) => {
        const faceX = 1 - face[1].x;

        return (
          Math.hypot(
            wrist.x - faceX,
            wrist.y - face[1].y
          ) < 0.24
        );
      })
  );

  // -----------------------------
  // POSE / SHOULDERS
  // -----------------------------

  const pose = poseResult.landmarks?.[0];

  let shoulders:
    | FrameAnalysis["shoulders"]
    | undefined;

  let torso:
    | FrameAnalysis["torso"]
    | undefined;

  if (pose) {
    const left = pose[11];
    const right = pose[12];

    const leftHip = pose[23];
    const rightHip = pose[24];

    if (left && right) {
      shoulders = {
        left: {
          x: left.x,
          y: left.y,
          visibility: left.visibility ?? 1,
        },

        right: {
          x: right.x,
          y: right.y,
          visibility: right.visibility ?? 1,
        },
      };

      torso = {
        leftShoulder: {
          x: 1 - left.x,
          y: left.y,
          z: left.z,
        },

        rightShoulder: {
          x: 1 - right.x,
          y: right.y,
          z: right.z,
        },

        leftHip: leftHip
          ? {
              x: 1 - leftHip.x,
              y: leftHip.y,
              z: leftHip.z,
            }
          : undefined,

        rightHip: rightHip
          ? {
              x: 1 - rightHip.x,
              y: rightHip.y,
              z: rightHip.z,
            }
          : undefined,
      };
    }
  }

  // -----------------------------
  // BOOK DETECTION
  // -----------------------------
  //
  // IMPORTANT:
  // objectResult can be undefined because the object detector
  // is optional. The previous version accessed
  // objectResult.detections directly, which caused:
  //
  // TS18048: 'objectResult' is possibly 'undefined'
  //
  // The optional chaining below fixes that safely.
  // -----------------------------

  const bookVisible =
    objectResult?.detections?.some((detection) =>
      detection.categories?.some(
        (category) =>
          category.categoryName?.toLowerCase() === "book" &&
          (category.score ?? 0) > 0.35
      )
    ) ?? false;

  // -----------------------------
  // FINAL FRAME ANALYSIS
  // -----------------------------

  return {
    smile,
    anger,
    mouthOpen,
    handNearHead,
    bookVisible,
    hands,
    handShapes,
    shoulders,
    torso,
  };
}
