"use client";

import { useEffect, useRef, useState } from "react";

type Estado = "idle" | "pedindo" | "ativa" | "erro";

export function CameraCapture({ onFoto }: { onFoto: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [erro, setErro] = useState<string | null>(null);

  function pararCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => pararCamera(), []);

  async function ativarCamera() {
    setErro(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErro(
        "A câmera ao vivo só funciona em conexão segura (HTTPS) ou em localhost. Use \"Escolher da galeria\" para tirar a foto pelo app da câmera do celular.",
      );
      setEstado("erro");
      return;
    }

    setEstado("pedindo");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado("ativa");
    } catch (e) {
      setErro(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Você precisa permitir o acesso à câmera pra tirar a foto."
          : "Não foi possível acessar a câmera deste dispositivo.",
      );
      setEstado("erro");
    }
  }

  function capturar() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onFoto(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
        pararCamera();
        setEstado("idle");
      },
      "image/jpeg",
      0.9,
    );
  }

  function cancelar() {
    pararCamera();
    setEstado("idle");
  }

  if (estado === "ativa") {
    return (
      <div className="card" style={{ padding: 8 }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            borderRadius: "var(--radius-sm)",
            aspectRatio: "4 / 3",
            objectFit: "cover",
            background: "#000",
          }}
        />
        <div className="flex gap-8 mt-8">
          <button type="button" className="btn btn-ghost" onClick={cancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-block" onClick={capturar}>
            📸 Capturar foto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={ativarCamera}
        disabled={estado === "pedindo"}
      >
        {estado === "pedindo" ? "Pedindo permissão…" : "📷 Ativar câmera"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 12 }}>
          {erro}
        </p>
      )}
      <label className="hint" style={{ display: "block", marginTop: 12, cursor: "pointer", textDecoration: "underline" }}>
        ou escolher da galeria
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFoto(file);
          }}
        />
      </label>
    </div>
  );
}
