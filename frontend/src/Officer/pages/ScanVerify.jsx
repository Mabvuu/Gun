import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import StatusIndicator from '../components/StatusIndicator';
import QuickDetails from '../components/QuickDetails';

/**
 * ScanVerify page
 * - QR (optional html5-qrcode)
 * - Web NFC (when supported)
 * - Manual fallback
 */

export default function ScanVerify() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState('unknown');
  const [message, setMessage] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);

  const nfcRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    setNfcSupported(Boolean(typeof window !== 'undefined' && 'NDEFReader' in window));
  }, []);

  const lookup = async (id) => {
    if (!id) return;
    setLoading(true);
    setMessage('');
    setRecord(null);
    setStatus('unknown');
    try {
      const res = await axios.get('/api/officer/verify', { params: { id } });
      const r = res.data || {};
      setRecord({
        serialMasked: r.serial ? `****${String(r.serial).slice(-4)}` : '****',
        licenseExpiry: r.licenseExpiry,
        lastInspection: r.lastInspection,
        ownerName: r.ownerName,
        flagReason: r.flagReason,
      });

      if (r.flag) setStatus('flagged');
      else if (r.licenseExpired) setStatus('expired');
      else setStatus('ok');
    } catch (err) {
      console.error('lookup error', err);
      setMessage(err?.response?.data?.message || 'Lookup failed');
      setStatus('unknown');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    lookup(input.trim());
  };

  // QR
  const startQr = async () => {
    if (!window.Html5Qrcode) {
      alert('QR scanner needs "html5-qrcode" package (optional).');
      return;
    }
    const html5Qr = new window.Html5Qrcode('qr-reader');
    qrRef.current = html5Qr;
    try {
      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decoded) => {
          lookup(decoded);
          // stop scanner after successful read
          stopQr().catch((err) => {
            console.error('stopQr after decode failed', err);
          });
        }
      );
    } catch (err) {
      console.error('QR start failed', err);
      alert('QR scanner failed to start');
    }
  };

  const stopQr = async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        try {
          qrRef.current.clear();
        } catch (clearErr) {
          console.error('qr clear failed', clearErr);
        }
        qrRef.current = null;
      }
    } catch (err) {
      console.error('QR stop error', err);
    }
  };

  // NFC
  const startNfc = async () => {
    if (!nfcSupported) {
      alert('Web NFC not supported in this browser');
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.onreading = (event) => {
        const sn = event.serialNumber || null;
        if (sn) {
          lookup(sn);
          return;
        }
        const textDecoder = new TextDecoder();
        for (const rec of event.message.records) {
          if (rec.recordType === 'text') {
            const text = textDecoder.decode(rec.data);
            lookup(text);
            break;
          }
        }
      };
      nfcRef.current = ndef;
    } catch (err) {
      console.error('NFC start failed', err);
      alert('NFC start failed: ' + (err?.message || err));
    }
  };

  const stopNfc = async () => {
    try {
      // no standard stop API — releasing reference so GC can collect
      nfcRef.current = null;
    } catch (err) {
      console.error('stopNfc error', err);
    }
  };

  // cleanup on unmount — call stop functions so they're considered used
  useEffect(() => {
    return () => {
      // stop QR if running
      stopQr().catch((err) => {
        console.error('cleanup stopQr failed', err);
      });

      // stop NFC reference
      stopNfc().catch((err) => {
        console.error('cleanup stopNfc failed', err);
      });
    };
  }, []);

  const logVerify = async () => {
    if (!record) {
      alert('No record to log');
      return;
    }
    try {
      await axios.post('/api/officer/verify/log', {
        idScanned: input || null,
        serialMasked: record.serialMasked,
      });
      alert('Verify logged');
    } catch (err) {
      console.error('logVerify', err);
      alert('Log failed');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50 md:p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-3">Scan & Verify</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Scan / Enter ID</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scan QR/NFC or type ID"
            className="w-full p-3 border rounded shadow-sm"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? 'Looking up...' : 'Lookup'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.Html5Qrcode) startQr();
                else alert('QR require html5-qrcode lib (optional).');
              }}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              QR
            </button>

            <button
              type="button"
              onClick={() => {
                if (nfcSupported) startNfc();
                else alert('Web NFC not supported on this device/browser');
              }}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              NFC
            </button>
          </div>
        </form>

        <div id="qr-reader" className="mt-3" />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <StatusIndicator status={status} />
          </div>
          <div className="text-sm text-gray-500">{message}</div>
        </div>

        <QuickDetails details={record} />

        <div className="mt-4 flex gap-2">
          <button
            onClick={logVerify}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Log verify
          </button>

          <button
            onClick={() => {
              setInput('');
              setRecord(null);
              setStatus('unknown');
              setMessage('');
            }}
            className="px-3 py-2 bg-gray-200 rounded"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <div>Quick details only — no sensitive documents or full owner data shown.</div>
          <div>Logs capture officer/station/time for audit.</div>
        </div>
      </div>
    </div>
  );
}
