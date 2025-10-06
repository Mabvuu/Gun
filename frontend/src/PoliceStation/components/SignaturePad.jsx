import React, { useRef, useEffect, useState } from 'react';

export default function SignaturePad({ onSave, width = 400, height = 150 }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width * 2; // high DPI
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctxRef.current = ctx;

    // clear initial
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [width, height]);

  const start = (e) => {
    drawing.current = true;
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    setIsEmpty(false);
  };

  const end = () => {
    drawing.current = false;
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    if (isEmpty) {
      alert('Please sign first.');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (onSave) onSave(dataUrl);
  };

  return (
    <div>
      <div style={{ border: '1px solid #ccc', borderRadius: 4, display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={end}
          style={{ touchAction: 'none', cursor: 'crosshair', background: 'white' }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={clear} type="button">Clear</button>
        <button onClick={save} type="button" style={{ marginLeft: 8 }}>Save Signature</button>
      </div>
    </div>
  );
}
