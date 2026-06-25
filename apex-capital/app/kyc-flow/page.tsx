"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  CreditCard,
  BadgeCheck,
  Camera,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client"; // adjust path to match your project structure

/* ------------------------------------------------------------------ */
/*  Types & config                                                     */
/* ------------------------------------------------------------------ */

type DocType = "passport" | "drivers_license" | "national_id";

type StepKey =
  | "personal"
  | "doc-type"
  | "doc-upload"
  | "face"
  | "review"
  | "submitted";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "personal", label: "Personal info" },
  { key: "doc-type", label: "Document type" },
  { key: "doc-upload", label: "Upload ID" },
  { key: "face", label: "Face match" },
  { key: "review", label: "Review" },
];

const DOC_OPTIONS: {
  id: DocType;
  title: string;
  description: string;
  icon: typeof FileText;
  needsBack: boolean;
}[] = [
  {
    id: "passport",
    title: "Passport",
    description: "Photo page only. Accepted from any country.",
    icon: FileText,
    needsBack: false,
  },
  {
    id: "drivers_license",
    title: "Driver's License",
    description: "Front and back required.",
    icon: CreditCard,
    needsBack: true,
  },
  {
    id: "national_id",
    title: "National ID",
    description: "Front and back required.",
    icon: BadgeCheck,
    needsBack: true,
  },
];

type LivenessPrompt = "center" | "turn_left" | "turn_right" | "blink";

const LIVENESS_SEQUENCE: { key: LivenessPrompt; instruction: string }[] = [
  { key: "center", instruction: "Look straight at the camera" },
  { key: "turn_left", instruction: "Slowly turn your head left" },
  { key: "turn_right", instruction: "Now turn your head right" },
  { key: "blink", instruction: "Center your face and blink twice" },
];

type PersonalInfo = {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  residentialAddress: string;
  city: string;
  country: string;
  postalCode: string;
};
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StepProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                isComplete
                  ? "bg-[#1a6b3c] text-white"
                  : isActive
                  ? "border-2 border-[#111827] bg-white text-[#111827]"
                  : "border border-[#E5E5E2] bg-white text-[#9CA3AF]"
              }`}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 ${
                  isComplete ? "bg-[#1a6b3c]" : "bg-[#E5E5E2]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: data URL -> Blob, for uploading straight to Storage         */
/* ------------------------------------------------------------------ */

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; ext: string } {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data");
  const contentType = matches[1];
  const binary = atob(matches[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { blob: new Blob([bytes], { type: contentType }), contentType, ext };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CompleteVerificationPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex]?.key ?? "personal";
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Personal info state ---
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    residentialAddress: "",
    city: "",
    country: "",
    postalCode: "",
  });
  const [personalErrors, setPersonalErrors] = useState<Partial<PersonalInfo>>({});

  // --- Document state ---
  const [docType, setDocType] = useState<DocType | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  // --- Face verification state ---
  const [livenessStepIndex, setLivenessStepIndex] = useState(0);
  const [livenessComplete, setLivenessComplete] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedDoc = DOC_OPTIONS.find((d) => d.id === docType) ?? null;

  /* ---------------------- Personal info handlers ------------------- */

  function updateField(field: keyof PersonalInfo, value: string) {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  }

  function validatePersonalInfo(): boolean {
    const errors: Partial<PersonalInfo> = {};
    if (!personalInfo.fullName.trim()) errors.fullName = "Required";
    if (!personalInfo.dateOfBirth.trim()) errors.dateOfBirth = "Required";
    if (!personalInfo.nationality.trim()) errors.nationality = "Required";
    if (!personalInfo.residentialAddress.trim())
      errors.residentialAddress = "Required";
    if (!personalInfo.city.trim()) errors.city = "Required";
    if (!personalInfo.country.trim()) errors.country = "Required";
    if (!personalInfo.postalCode.trim()) errors.postalCode = "Required";

    // Basic age check (18+)
    if (personalInfo.dateOfBirth) {
      const dob = new Date(personalInfo.dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) {
        errors.dateOfBirth = "Must be 18 or older";
      }
    }

    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /* ---------------------- Document upload handlers ------------------ */

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setDocUploadError("Upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocUploadError("File must be under 10MB.");
      return;
    }

    setDocUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (side === "front") setFrontImage(result);
      else setBackImage(result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage(side: "front" | "back") {
    if (side === "front") setFrontImage(null);
    else setBackImage(null);
  }

  /* ---------------------- Camera / liveness handlers ----------------- */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(
        "Couldn't access your camera. Check your browser permissions and try again."
      );
    }
  }, []);

  useEffect(() => {
    if (currentStep === "face" && !livenessComplete) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, livenessComplete]);

  function captureSelfieFrame() {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // mirror, since the preview is mirrored
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function handleLivenessNext() {
    const isLastPrompt = livenessStepIndex === LIVENESS_SEQUENCE.length - 1;

    if (isLastPrompt) {
      const frame = captureSelfieFrame();
      setCapturedSelfie(frame);
      stopCamera();
      setLivenessComplete(true);
    } else {
      setLivenessStepIndex((i) => i + 1);
    }
  }

  function retakeLiveness() {
    setLivenessStepIndex(0);
    setLivenessComplete(false);
    setCapturedSelfie(null);
    startCamera();
  }

  /* ---------------------- Step navigation ---------------------------- */

  function canAdvanceFromDocUpload(): boolean {
    if (!frontImage) return false;
    if (selectedDoc?.needsBack && !backImage) return false;
    return true;
  }

  function goNext() {
    if (currentStep === "personal") {
      if (!validatePersonalInfo()) return;
    }
    if (currentStep === "doc-type" && !docType) return;
    if (currentStep === "doc-upload" && !canAdvanceFromDocUpload()) {
      setDocUploadError("Upload all required pages before continuing.");
      return;
    }
    if (currentStep === "face" && !livenessComplete) return;

    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  /* ---------------------- Submit: upload directly to Storage --------- */

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubmitError("Your session expired. Please log in again.");
        setSubmitting(false);
        return;
      }

      // Upload one image directly to Storage from the browser, using the
      // user's own real session — no server round-trip for the bytes.
      async function uploadToStorage(
        dataUrl: string | null,
        bucket: string,
        filename: string
      ): Promise<string | null> {
        if (!dataUrl || !user) return null;
        const { blob, contentType, ext } = dataUrlToBlob(dataUrl);
        const path = `${user.id}/${filename}-${Date.now()}.${ext}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, blob, { contentType, upsert: true });

        if (error) {
          throw new Error(`Failed to upload ${filename}: ${error.message}`);
        }
        return path;
      }

      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadToStorage(frontImage, "kyc-documents", "front"),
        uploadToStorage(backImage, "kyc-documents", "back"),
        uploadToStorage(capturedSelfie, "kyc-selfies", "selfie"),
      ]);

      // Now just send the small JSON (paths only, no image bytes) to the
      // API route, which writes the row to the database.
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalInfo,
          docType,
          frontPath,
          backPath,
          selfiePath,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setStepIndex(STEPS.length);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
      );
      setSubmitting(false);
    }
  }

  const isSubmittedView = stepIndex >= STEPS.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] font-sans text-[#111827]">
      {/* Header */}
      <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#111827]">
            Apex Capital
          </Link>
          {!isSubmittedView && (
            <Link
              href="/dashboard"
              className="text-[13px] text-[#6B7280] transition-colors hover:text-[#111827]"
            >
              Finish later
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl">
          {!isSubmittedView ? (
            <>
              {/* Title */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#1a6b3c]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Identity verification
                </div>
                <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-[#111827] sm:text-[30px]">
                  {STEPS[stepIndex].label}
                </h1>
              </div>

              {/* Progress */}
              <div className="mb-10">
                <StepProgress currentIndex={stepIndex} />
              </div>

              {/* Card */}
              <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm sm:p-8">
                {currentStep === "personal" && (
                  <PersonalInfoStep
                    info={personalInfo}
                    errors={personalErrors}
                    onChange={updateField}
                  />
                )}

                {currentStep === "doc-type" && (
                  <DocTypeStep selected={docType} onSelect={setDocType} />
                )}

                {currentStep === "doc-upload" && selectedDoc && (
                  <DocUploadStep
                    doc={selectedDoc}
                    frontImage={frontImage}
                    backImage={backImage}
                    error={docUploadError}
                    onFileSelect={handleFileSelect}
                    onRemove={removeImage}
                  />
                )}

                {currentStep === "face" && (
                  <FaceVerificationStep
                    livenessStepIndex={livenessStepIndex}
                    livenessComplete={livenessComplete}
                    capturedSelfie={capturedSelfie}
                    cameraError={cameraError}
                    cameraReady={cameraReady}
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    onNextPrompt={handleLivenessNext}
                    onRetake={retakeLiveness}
                    onRetryCamera={startCamera}
                  />
                )}

                {currentStep === "review" && (
                  <ReviewStep
                    personalInfo={personalInfo}
                    docType={selectedDoc?.title ?? ""}
                    frontImage={frontImage}
                    backImage={backImage}
                    selfie={capturedSelfie}
                    submitError={submitError}
                  />
                )}
              </div>

              {/* Nav buttons */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#6B7280] transition-colors hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                {currentStep !== "review" ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={
                      (currentStep === "doc-type" && !docType) ||
                      (currentStep === "doc-upload" && !canAdvanceFromDocUpload()) ||
                      (currentStep === "face" && !livenessComplete)
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-[#111827] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting
                      </>
                    ) : (
                      <>
                        Submit for verification
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <SubmittedView onContinue={() => router.push("/dashboard")} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Personal info                                               */
/* ------------------------------------------------------------------ */

function PersonalInfoStep({
  info,
  errors,
  onChange,
}: {
  info: PersonalInfo;
  errors: Partial<PersonalInfo>;
  onChange: (field: keyof PersonalInfo, value: string) => void;
}) {
  const fieldClass = (hasError: boolean) =>
    `w-full rounded-lg border bg-[#F7F7F5] px-3.5 py-2.5 text-[14px] text-[#111827] outline-none transition-colors focus:border-[#111827] focus:ring-1 focus:ring-[#111827] ${
      hasError ? "border-red-300" : "border-[#E5E5E2]"
    }`;

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">
        Enter your details exactly as they appear on your government-issued ID.
      </p>

      <div>
        <label className="text-[13px] font-medium text-[#111827]">Full legal name</label>
        <input
          type="text"
          value={info.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          placeholder="As shown on your ID"
          className={`mt-1.5 ${fieldClass(!!errors.fullName)}`}
        />
        {errors.fullName && <p className="mt-1 text-[12px] text-red-600">{errors.fullName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="text-[13px] font-medium text-[#111827]">Date of birth</label>
          <input
            type="date"
            value={info.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            className={`mt-1.5 ${fieldClass(!!errors.dateOfBirth)}`}
          />
          {errors.dateOfBirth && (
            <p className="mt-1 text-[12px] text-red-600">{errors.dateOfBirth}</p>
          )}
        </div>
        <div>
          <label className="text-[13px] font-medium text-[#111827]">Nationality</label>
          <input
            type="text"
            value={info.nationality}
            onChange={(e) => onChange("nationality", e.target.value)}
            placeholder="e.g. Mexican, American"
            className={`mt-1.5 ${fieldClass(!!errors.nationality)}`}
          />
          {errors.nationality && (
            <p className="mt-1 text-[12px] text-red-600">{errors.nationality}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#111827]">Residential address</label>
        <input
          type="text"
          value={info.residentialAddress}
          onChange={(e) => onChange("residentialAddress", e.target.value)}
          placeholder="Street address"
          className={`mt-1.5 ${fieldClass(!!errors.residentialAddress)}`}
        />
        {errors.residentialAddress && (
          <p className="mt-1 text-[12px] text-red-600">{errors.residentialAddress}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="text-[13px] font-medium text-[#111827]">City</label>
          <input
            type="text"
            value={info.city}
            onChange={(e) => onChange("city", e.target.value)}
            className={`mt-1.5 ${fieldClass(!!errors.city)}`}
          />
          {errors.city && <p className="mt-1 text-[12px] text-red-600">{errors.city}</p>}
        </div>
        <div>
          <label className="text-[13px] font-medium text-[#111827]">Country</label>
          <input
            type="text"
            value={info.country}
            onChange={(e) => onChange("country", e.target.value)}
            className={`mt-1.5 ${fieldClass(!!errors.country)}`}
          />
          {errors.country && <p className="mt-1 text-[12px] text-red-600">{errors.country}</p>}
        </div>
        <div>
          <label className="text-[13px] font-medium text-[#111827]">Postal code</label>
          <input
            type="text"
            value={info.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            className={`mt-1.5 ${fieldClass(!!errors.postalCode)}`}
          />
          {errors.postalCode && (
            <p className="mt-1 text-[12px] text-red-600">{errors.postalCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Document type selection                                    */
/* ------------------------------------------------------------------ */

function DocTypeStep({
  selected,
  onSelect,
}: {
  selected: DocType | null;
  onSelect: (type: DocType) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">
        Choose the government-issued ID you&apos;d like to verify with.
      </p>

      <div className="space-y-3">
        {DOC_OPTIONS.map((doc) => {
          const isSelected = selected === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelect(doc.id)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-[#111827] bg-[#F7F7F5]"
                  : "border-[#E5E5E2] bg-white hover:bg-[#F7F7F5]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-[#111827]" : "bg-[#F3F4F6]"
                }`}
              >
                <doc.icon
                  className={`h-5 w-5 ${isSelected ? "text-white" : "text-[#6B7280]"}`}
                  strokeWidth={1.75}
                />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#111827]">{doc.title}</p>
                <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{doc.description}</p>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-[#111827] bg-[#111827]" : "border-[#D1D5DB]"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Document upload                                            */
/* ------------------------------------------------------------------ */

function DocUploadStep({
  doc,
  frontImage,
  backImage,
  error,
  onFileSelect,
  onRemove,
}: {
  doc: { id: DocType; title: string; needsBack: boolean };
  frontImage: string | null;
  backImage: string | null;
  error: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => void;
  onRemove: (side: "front" | "back") => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">
        Upload a clear photo of your <span className="font-medium text-[#111827]">{doc.title}</span>.
        Make sure all four corners are visible and text is readable.
      </p>

      <UploadSlot
        label={doc.id === "passport" ? "Photo page" : "Front side"}
        image={frontImage}
        onFileSelect={(e) => onFileSelect(e, "front")}
        onRemove={() => onRemove("front")}
      />

      {doc.needsBack && (
        <UploadSlot
          label="Back side"
          image={backImage}
          onFileSelect={(e) => onFileSelect(e, "back")}
          onRemove={() => onRemove("back")}
        />
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function UploadSlot({
  label,
  image,
  onFileSelect,
  onRemove,
}: {
  label: string;
  image: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-[#111827]">{label}</p>
      {image ? (
        <div className="relative overflow-hidden rounded-xl border border-[#E5E5E2]">
          <img src={image} alt={label} className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F7F7F5] transition-colors hover:border-[#9CA3AF]"
        >
          <Upload className="h-5 w-5 text-[#9CA3AF]" />
          <span className="text-[13px] font-medium text-[#6B7280]">
            Click to upload
          </span>
          <span className="text-[11px] text-[#9CA3AF]">JPG, PNG, or PDF — up to 10MB</span>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFileSelect}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4: Face verification (liveness)                               */
/* ------------------------------------------------------------------ */

function FaceVerificationStep({
  livenessStepIndex,
  livenessComplete,
  capturedSelfie,
  cameraError,
  cameraReady,
  videoRef,
  canvasRef,
  onNextPrompt,
  onRetake,
  onRetryCamera,
}: {
  livenessStepIndex: number;
  livenessComplete: boolean;
  capturedSelfie: string | null;
  cameraError: string | null;
  cameraReady: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onNextPrompt: () => void;
  onRetake: () => void;
  onRetryCamera: () => void;
}) {
  const currentPrompt = LIVENESS_SEQUENCE[livenessStepIndex];
  const isLastPrompt = livenessStepIndex === LIVENESS_SEQUENCE.length - 1;

  if (livenessComplete && capturedSelfie) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-[#1a6b3c]">
          <img src={capturedSelfie} alt="Captured selfie" className="h-full w-full object-cover" />
        </div>
        <div className="mt-5 flex items-center gap-1.5 text-[14px] font-semibold text-[#1a6b3c]">
          <CheckCircle2 className="h-4.5 w-4.5" />
          Face verification captured
        </div>
        <p className="mt-1.5 max-w-xs text-[13px] text-[#6B7280]">
          We&apos;ll match this against your ID document during review.
        </p>
        <button
          type="button"
          onClick={onRetake}
          className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retake
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="max-w-sm text-[13px] leading-relaxed text-[#6B7280]">
        Position your face in the frame. We&apos;ll guide you through a few quick
        movements to confirm you&apos;re really here.
      </p>

      <div className="relative mt-6 h-64 w-64 overflow-hidden rounded-full border-4 border-[#E5E5E2] bg-[#111827]">
        {cameraError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Camera className="h-7 w-7 text-white/50" />
            <p className="text-[12px] text-white/70">{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover [transform:scaleX(-1)]"
          />
        )}
        {/* Liveness guide ring */}
        {!cameraError && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/30" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {cameraError ? (
        <button
          type="button"
          onClick={onRetryCamera}
          className="mt-5 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          Allow camera access
        </button>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-2">
            {LIVENESS_SEQUENCE.map((step, i) => (
              <div
                key={step.key}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i < livenessStepIndex
                    ? "bg-[#1a6b3c]"
                    : i === livenessStepIndex
                    ? "bg-[#111827]"
                    : "bg-[#E5E5E2]"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-[15px] font-semibold text-[#111827]">
            {currentPrompt.instruction}
          </p>

          <button
            type="button"
            onClick={onNextPrompt}
            disabled={!cameraReady}
            className="mt-5 rounded-lg bg-[#111827] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastPrompt ? "Capture" : "Done, next step"}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5: Review                                                     */
/* ------------------------------------------------------------------ */

function ReviewStep({
  personalInfo,
  docType,
  frontImage,
  backImage,
  selfie,
  submitError,
}: {
  personalInfo: PersonalInfo;
  docType: string;
  frontImage: string | null;
  backImage: string | null;
  selfie: string | null;
  submitError: string | null;
}) {
  return (
    <div className="space-y-6">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">
        Check everything below before you submit. You won&apos;t be able to edit
        this information until your review is complete.
      </p>

      {/* Personal info summary */}
      <div className="rounded-xl border border-[#E5E5E2] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Personal information
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
          <SummaryField label="Full name" value={personalInfo.fullName} />
          <SummaryField label="Date of birth" value={personalInfo.dateOfBirth} />
          <SummaryField label="Nationality" value={personalInfo.nationality} />
          <SummaryField
            label="Address"
            value={`${personalInfo.residentialAddress}, ${personalInfo.city}`}
          />
          <SummaryField label="Country" value={personalInfo.country} />
          <SummaryField label="Postal code" value={personalInfo.postalCode} />
        </div>
      </div>

      {/* Document summary */}
      <div className="rounded-xl border border-[#E5E5E2] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Identity document
        </p>
        <p className="mt-2 text-[13px] font-medium text-[#111827]">{docType}</p>
        <div className="mt-3 flex gap-3">
          {frontImage && (
            <img
              src={frontImage}
              alt="Document front"
              className="h-20 w-28 rounded-lg border border-[#E5E5E2] object-cover"
            />
          )}
          {backImage && (
            <img
              src={backImage}
              alt="Document back"
              className="h-20 w-28 rounded-lg border border-[#E5E5E2] object-cover"
            />
          )}
        </div>
      </div>

      {/* Face verification summary */}
      <div className="rounded-xl border border-[#E5E5E2] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Face verification
        </p>
        <div className="mt-3 flex items-center gap-3">
          {selfie && (
            <img
              src={selfie}
              alt="Captured selfie"
              className="h-16 w-16 rounded-full border border-[#E5E5E2] object-cover"
            />
          )}
          <p className="flex items-center gap-1.5 text-[13px] text-[#1a6b3c]">
            <CheckCircle2 className="h-4 w-4" />
            Liveness check completed
          </p>
        </div>
      </div>

      {submitError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-[#9CA3AF]">
        By submitting, you confirm this information is accurate and consent to
        identity verification checks required under our Know Your Customer (KYC)
        policy.
      </p>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[#9CA3AF]">{label}</p>
      <p className="mt-0.5 font-medium text-[#111827]">{value || "—"}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Final: Submitted confirmation                                      */
/* ------------------------------------------------------------------ */

function SubmittedView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F7F2]">
        <CheckCircle2 className="h-7 w-7 text-[#1a6b3c]" strokeWidth={1.75} />
      </div>
      <h1 className="mt-6 text-[24px] font-extrabold tracking-tight text-[#111827]">
        Verification submitted
      </h1>
      <p className="mx-auto mt-2.5 max-w-sm text-[14px] leading-relaxed text-[#6B7280]">
        We&apos;re reviewing your documents now. This usually takes less than 10
        minutes, but can take up to 24 hours. We&apos;ll email you the moment
        it&apos;s done.
      </p>

      <div className="mx-auto mt-7 max-w-xs rounded-xl bg-[#F7F7F5] p-4 text-left">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#111827]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9CA3AF]" />
          Status: Under review
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-7 w-full rounded-lg bg-[#111827] px-5 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:px-8"
      >
        Continue to dashboard
      </button>
      <p className="mt-3 text-[12px] text-[#9CA3AF]">
        You can browse the app now. Deposits and trading unlock once you&apos;re verified.
      </p>
    </div>
  );
}