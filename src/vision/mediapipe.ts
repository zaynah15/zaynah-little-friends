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

export type Point = { x: number; y: number; z?: number };

export type FrameAnalysis = {
  smile: number;
  anger: number;
  mouthOpen: number;
  mouthPucker: number;
  handNearChin: boolean;
  handNearMouth: boolean;
  indexPointing: boolean;
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
    left: { x: number; y: number; visibility: number };
    right: { x: number; y: number; visibility: number };
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
      baseOptions: { modelAssetPath: MODELS.face },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    }),
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELS.hand },
      runningMode: "VIDEO",
      numHands: 2,
    }),
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELS.pose },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  ]);

  // Book detection is intentionally optional: the gesture detector is the
  // primary reading signal, so a failure to load the larger object detector
  // must never prevent the camera experience from starting.
  let objectDetector: ObjectDetector | undefined;
  try {
    objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELS.object },
      runningMode: "VIDEO",
      scoreThreshold: 0.35,
      maxResults: 3,
    });
  } catch (error) {
    console.warn("Optional book detector unavailable; using hand gesture detection.", error);
  }

  return { face, hand, pose, objectDetector };
}

function score(
  categories: Array<{ categoryName?: string; score?: number }> | undefined,
  name: string
) {
  return categories?.find((c) => c.categoryName === name)?.score ?? 0;
}

function dist(a: Point, b: Point) {
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
  const objectResult = bundle.objectDetector?.detectForVideo(video, timestamp);

  const cats = faceResult.faceBlendshapes?.[0]?.categories;

  const smile = Math.max(
    score(cats, "mouthSmileLeft"),
    score(cats, "mouthSmileRight")
  );

  const browDown = (score(cats, "browDownLeft") + score(cats, "browDownRight")) / 2;
  const mouthFrown = (score(cats, "mouthFrownLeft") + score(cats, "mouthFrownRight")) / 2;
  const anger = Math.min(1, browDown * 0.7 + mouthFrown * 0.4);
  const mouthOpen = Math.max(
    score(cats, "jawOpen"),
    score(cats, "mouthOpen")
  );

  const mouthPucker = Math.max(
    score(cats, "mouthPucker"),
    score(cats, "mouthFunnel")
  );

  const handShapes = (handResult.landmarks ?? []).map((raw) => {
    // Mirror x because the visible camera is mirrored.
    const p = (i: number): Point => ({ x: 1 - raw[i].x, y: raw[i].y, z: raw[i].z });
    const wrist = p(0);
    const indexTip = p(8);
    const thumbTip = p(4);
    const palm = p(9);

    // Larger = more open hand. Small = hand/fingers closer together.
    const openness =
      (dist(p(8), p(5)) +
        dist(p(12), p(9)) +
        dist(p(16), p(13)) +
        dist(p(20), p(17))) / 4;

    return { wrist, indexTip, thumbTip, palm, openness };
  });

  const hands = handShapes.map((h) => h.wrist);

  const face = faceResult.faceLandmarks?.[0];
  const chinPoint = face
    ? { x: 1 - face[152].x, y: face[152].y }
    : null;
  const mouthPoint = face
    ? { x: 1 - face[13].x, y: face[13].y }
    : null;

  const handNearChin = Boolean(
    chinPoint &&
      hands.some((wrist) => Math.hypot(wrist.x - chinPoint.x, wrist.y - chinPoint.y) < 0.20)
  );

  const handNearMouth = Boolean(
    mouthPoint &&
      handShapes.some((hand) => Math.hypot(hand.palm.x - mouthPoint.x, hand.palm.y - mouthPoint.y) < 0.19)
  );

  const primaryHand = handResult.landmarks?.[0];
  let indexPointing = false;

  if (primaryHand) {
    const p = (i: number) => ({ x: 1 - primaryHand[i].x, y: primaryHand[i].y });
    const wrist = p(0);
    const index = p(8);
    const middle = p(12);
    const ring = p(16);
    const pinky = p(20);
    const indexBase = p(5);
    const middleBase = p(9);
    const ringBase = p(13);
    const pinkyBase = p(17);

    const indexExtended = dist(index, wrist) > dist(indexBase, wrist) * 1.28;
    const middleFolded = dist(middle, wrist) < dist(middleBase, wrist) * 1.18;
    const ringFolded = dist(ring, wrist) < dist(ringBase, wrist) * 1.18;
    const pinkyFolded = dist(pinky, wrist) < dist(pinkyBase, wrist) * 1.18;

    indexPointing = indexExtended && middleFolded && ringFolded && pinkyFolded;
  }



  const pose = poseResult.landmarks?.[0];
  let shoulders;
  let torso;

  if (pose) {
    const left = pose[11];
    const right = pose[12];
    const leftHip = pose[23];
    const rightHip = pose[24];

    if (left && right) {
      // Return shoulder coordinates in the same mirrored screen space as the
      // camera preview. Pose landmark 11 is the user's LEFT shoulder.
      shoulders = {
        left: { x: 1 - left.x, y: left.y, visibility: left.visibility ?? 1 },
        right: { x: 1 - right.x, y: right.y, visibility: right.visibility ?? 1 },
      };

      torso = {
        leftShoulder: { x: 1 - left.x, y: left.y, z: left.z },
        rightShoulder: { x: 1 - right.x, y: right.y, z: right.z },
        leftHip: leftHip ? { x: 1 - leftHip.x, y: leftHip.y, z: leftHip.z } : undefined,
        rightHip: rightHip ? { x: 1 - rightHip.x, y: rightHip.y, z: rightHip.z } : undefined,
      };
    }
  }

  const bookVisible =
    objectResult?.detections?.some((d) =>
      d.categories?.some(
        (c) =>
          c.categoryName?.toLowerCase() === "book" &&
          (c.score ?? 0) > 0.35
      )
    ) ?? false;

  return {
    smile,
    anger,
    mouthOpen,
    mouthPucker,
    handNearChin,
    handNearMouth,
    indexPointing,
    bookVisible,
    hands,
    handShapes,
    shoulders,
    torso,
  };
}
