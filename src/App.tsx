import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { AudioContext, AudioBuffer, GainNode, AudioBufferSourceNode } from 'react-native-audio-api';

import './App.css';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  label?: string;
  onChange?: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  label,
  onChange,
}) => {
  const uniqueId = useRef(
    `rangeInput${label ? label.toLocaleUpperCase() : ''}${Math.random() * 1000}`,
  );

  const onChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(Number(e.target.value));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {label && (
        <label htmlFor={uniqueId.current} style={{ marginRight: '12px' }}>
          {label}
        </label>
      )}
      <input
        id={uniqueId.current}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChangeWrapper}
        style={{ width: '200px' }}
      />
      <span style={{ marginLeft: '12px', width: '50px' }}>{value}</span>
    </div>
  );
};

const inputMaxValue = 1000;

interface LinearRange {
  type: 'linear';
  start: number;
  end: number;
  valueStart: number;
  valueEnd: number;
}

interface ConstantRange {
  type: 'constant';
  start: number;
  end: number;
  value: number;
}

type Range = LinearRange | ConstantRange;

interface Sample {
  id: string;
  url: string;
  ranges: Range[];
}

/*
0 - 0.2 - first sample
0.2 - 0.4 - second sample
0.4 - 0.6 - third sample
0.6 - 0.8 - fourth sample
0.8 - 1.0 - fifth sample
*/

const samples: Sample[] = [
  {
    id: '1',
    url: 'https://tonejs.github.io/audio/salamander/C4.mp3',
    ranges: [
      {
        type: 'constant',
        start: 0,
        end: 0.15,
        value: 1.0,
      },
      {
        type: 'linear',
        start: 0.15,
        end: 0.25,
        valueStart: 1.0,
        valueEnd: 0.0,
      },
    ],
  },
  {
    id: '2',
    url: 'https://tonejs.github.io/audio/salamander/Ds4.mp3',
    ranges: [
      {
        type: 'linear',
        start: 0.15,
        end: 0.25,
        valueStart: 0.0,
        valueEnd: 1.0,
      },
      {
        type: 'constant',
        start: 0.25,
        end: 0.35,
        value: 1.0,
      },
      {
        type: 'linear',
        start: 0.35,
        end: 0.45,
        valueStart: 1.0,
        valueEnd: 0.0,
      },
    ],
  },
  {
    id: '3',
    url: 'https://tonejs.github.io/audio/salamander/Fs4.mp3',
    ranges: [
      {
        type: 'linear',
        start: 0.35,
        end: 0.45,
        valueStart: 0.0,
        valueEnd: 1.0,
      },
      {
        type: 'constant',
        start: 0.45,
        end: 0.55,
        value: 1.0,
      },
      {
        type: 'linear',
        start: 0.55,
        end: 0.65,
        valueStart: 1.0,
        valueEnd: 0.0,
      },
    ],
  },
  {
    id: '4',
    url: 'https://tonejs.github.io/audio/salamander/A4.mp3',
    ranges: [
      {
        type: 'linear',
        start: 0.55,
        end: 0.65,
        valueStart: 0.0,
        valueEnd: 1.0,
      },
      {
        type: 'constant',
        start: 0.65,
        end: 0.75,
        value: 1.0,
      },
      {
        type: 'linear',
        start: 0.75,
        end: 0.85,
        valueStart: 1.0,
        valueEnd: 0.0,
      },
    ],
  },
  {
    id: '5',
    url: 'https://tonejs.github.io/audio/salamander/C5.mp3',
    ranges: [
      {
        type: 'linear',
        start: 0.75,
        end: 0.85,
        valueStart: 0.0,
        valueEnd: 1.0,
      },
      {
        type: 'constant',
        start: 0.85,
        end: 1.0,
        value: 1.0,
      },
    ],
  },
];

function valueInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function App() {
  const [state, setState] = useState<
    'uninitialized' | 'initializing' | 'ready'
  >('uninitialized');

  const [masterGain, setMasterGain] = useState(50);
  const [simulatedInput, setSimulatedInput] = useState(0);

  const aCtxRef = useRef<AudioContext | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const instrumentGainNodeRef = useRef<GainNode | null>(null);

  const sourceNodeEnvelopesRef = useRef<GainNode[]>([]);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Preload all samples
  async function loadSamples(aCtx: AudioContext) {
    return await Promise.all(
      samples.map(async sample => {
        const rawData = await fetch(sample.url).then(r => r.arrayBuffer());
        return await aCtx.decodeAudioData(rawData);
      }),
    );
  }

  const onSetup = async () => {
    if (state !== 'uninitialized') {
      return;
    }

    setState('initializing');

    aCtxRef.current = new AudioContext();
    const aCtx = aCtxRef.current;

    const audioBuffers = await loadSamples(aCtx);

    if (aCtx.state !== 'running') {
      setState('uninitialized');
      return;
    }

    masterGainNodeRef.current = aCtxRef.current.createGain();
    instrumentGainNodeRef.current = aCtxRef.current.createGain();

    masterGainNodeRef.current.connect(aCtx.destination);
    instrumentGainNodeRef.current.connect(masterGainNodeRef.current);

    samples.forEach((_sample, idx) => {
      const buffer = audioBuffers[idx];

      sourceNodesRef.current[idx] = aCtx.createBufferSource();
      sourceNodesRef.current[idx].buffer = buffer;
      sourceNodesRef.current[idx].loop = true;

      // Halulu?
      sourceNodesRef.current[idx].loopStart = 0.1;
      sourceNodesRef.current[idx].loopEnd = 0.35;

      sourceNodeEnvelopesRef.current[idx] = aCtx.createGain();
      sourceNodeEnvelopesRef.current[idx].gain.value = 0.0;

      sourceNodesRef.current[idx].connect(sourceNodeEnvelopesRef.current[idx]);

      sourceNodeEnvelopesRef.current[idx].connect(
        instrumentGainNodeRef.current!,
      );

      sourceNodesRef.current[idx].start();
    });

    setState('ready');
  };

  const sampleVolumes = useMemo(() => {
    const inValue = simulatedInput / inputMaxValue;
    const values: number[] = Array(samples.length).fill(0);

    samples.forEach((sample, sampleIndex) => {
      sample.ranges.forEach(range => {
        if (!valueInRange(inValue, range.start, range.end)) {
          // This range for this given value is not active
          return;
        }

        if (range.type === 'constant') {
          values[sampleIndex] = range.value;
          return;
        }
        const value =
          range.valueStart +
          (range.valueEnd - range.valueStart) *
            ((inValue - range.start) / (range.end - range.start));

        values[sampleIndex] = value;
      });
    });

    return {
      outputVolume: simulatedInput / inputMaxValue,
      values,
    };
  }, [simulatedInput]);

  useEffect(() => {
    if (state !== 'ready') {
      return;
    }

    if (
      !masterGainNodeRef.current ||
      !aCtxRef.current ||
      !instrumentGainNodeRef.current
    ) {
      return;
    }

    masterGainNodeRef.current.gain.value = masterGain / 100.0;
    instrumentGainNodeRef.current.gain.value = sampleVolumes.outputVolume;

    console.log(
      masterGain / 100.0,
      sampleVolumes.outputVolume,
      sampleVolumes.values,
    );

    sourceNodeEnvelopesRef.current.forEach((envelope, idx) => {
      envelope.gain.value = sampleVolumes.values[idx];
    });
  }, [sampleVolumes, state]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '120px',
      }}>
      <button type="button" onClick={onSetup}>
        Setup and start
      </button>
      <Slider
        min={0}
        max={100}
        step={1}
        value={masterGain}
        onChange={setMasterGain}
        label="Master gain"
      />
      <div style={{ height: '120px' }} />
      <Slider
        min={0}
        max={inputMaxValue}
        step={1}
        value={simulatedInput}
        onChange={setSimulatedInput}
        label="Simulated input dynamics"
      />
      <div style={{ height: '24px' }} />
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {sampleVolumes.values.map((value, index) => (
          <div
            key={index}
            style={{
              margin: '12px',
              width: '120px',
              height: '120px',
              display: 'flex',
              borderWidth: 1,
              borderStyle: 'solid',
              alignItems: 'center',
              borderColor: '#ffffff',
              justifyContent: 'center',
              position: 'relative',
              color: '#ffffff',
            }}>
            <div
              style={{
                position: 'absolute',
                top: 120 - 120 * (value / 100),
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#abcdef',
                opacity: 0.5,
                zIndex: 1,
              }}
            />
            {`Volume: ${String(Math.floor(value * 100)).padStart(3, '0')}`}
          </div>
        ))}
      </div>
      <div style={{ height: '24px' }} />
      <div
        style={{}}>{`Output volume: ${String(Math.floor(sampleVolumes.outputVolume * 100)).padStart(3, '0')}`}</div>
    </div>
  );
}

export default App;
