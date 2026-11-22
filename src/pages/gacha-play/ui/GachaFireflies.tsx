import type { CSSProperties } from 'react';
import './GachaFireflies.css';

type FireflyPath = 'rise' | 'sway' | 'wander';

type Firefly = {
  id: string;
  left: string;
  top: string;
  halo: number;
  coreStop: string;
  x: number;
  y: number;
  path: FireflyPath;
  driftDuration: number;
  pulseDuration: number;
  driftDelay: number;
  pulseDelay: number;
  dim: string;
  bright: string;
  wideOnly: boolean;
};

type FireflyStyle = CSSProperties & {
  '--firefly-x': string;
  '--firefly-y': string;
  '--firefly-core': string;
  '--firefly-dim': string;
  '--firefly-bright': string;
};

const pathClassName: Record<FireflyPath, string> = {
  rise: 'gacha-firefly--rise',
  sway: 'gacha-firefly--sway',
  wander: 'gacha-firefly--wander',
};

const fireflies: readonly Firefly[] = [
  {
    id: 'lantern-left',
    left: '8%',
    top: '24%',
    halo: 20,
    coreStop: '12%',
    x: 16,
    y: -42,
    path: 'rise',
    driftDuration: 9,
    pulseDuration: 2.6,
    driftDelay: -1.4,
    pulseDelay: -0.4,
    dim: '0.4',
    bright: '0.86',
    wideOnly: false,
  },
  {
    id: 'eave-left',
    left: '16%',
    top: '40%',
    halo: 28,
    coreStop: '11%',
    x: 46,
    y: -16,
    path: 'sway',
    driftDuration: 12.5,
    pulseDuration: 3.4,
    driftDelay: -4.2,
    pulseDelay: -1.1,
    dim: '0.38',
    bright: '0.82',
    wideOnly: false,
  },
  {
    id: 'sign-low',
    left: '12%',
    top: '58%',
    halo: 24,
    coreStop: '13%',
    x: -22,
    y: -34,
    path: 'wander',
    driftDuration: 11,
    pulseDuration: 4.2,
    driftDelay: -6.8,
    pulseDelay: -2.4,
    dim: '0.42',
    bright: '0.8',
    wideOnly: false,
  },
  {
    id: 'wire-top',
    left: '22%',
    top: '14%',
    halo: 18,
    coreStop: '11%',
    x: 18,
    y: 22,
    path: 'wander',
    driftDuration: 8,
    pulseDuration: 2.2,
    driftDelay: -0.6,
    pulseDelay: -0.8,
    dim: '0.46',
    bright: '0.9',
    wideOnly: false,
  },
  {
    id: 'post-mid',
    left: '27%',
    top: '48%',
    halo: 32,
    coreStop: '12%',
    x: -18,
    y: -52,
    path: 'rise',
    driftDuration: 13.5,
    pulseDuration: 3.8,
    driftDelay: -8.1,
    pulseDelay: -1.6,
    dim: '0.36',
    bright: '0.78',
    wideOnly: false,
  },
  {
    id: 'shop-left',
    left: '33%',
    top: '26%',
    halo: 22,
    coreStop: '14%',
    x: -48,
    y: 16,
    path: 'sway',
    driftDuration: 10.5,
    pulseDuration: 2.9,
    driftDelay: -2.7,
    pulseDelay: -0.2,
    dim: '0.44',
    bright: '0.88',
    wideOnly: false,
  },
  {
    id: 'sky-left',
    left: '38%',
    top: '10%',
    halo: 26,
    coreStop: '12%',
    x: 20,
    y: -28,
    path: 'rise',
    driftDuration: 7.5,
    pulseDuration: 4.6,
    driftDelay: -3.3,
    pulseDelay: -3.1,
    dim: '0.4',
    bright: '0.84',
    wideOnly: false,
  },
  {
    id: 'canopy',
    left: '44%',
    top: '32%',
    halo: 35,
    coreStop: '14%',
    x: 28,
    y: -46,
    path: 'wander',
    driftDuration: 14,
    pulseDuration: 3.2,
    driftDelay: -9.4,
    pulseDelay: -1.9,
    dim: '0.34',
    bright: '0.76',
    wideOnly: false,
  },
  {
    id: 'sky-mid',
    left: '50%',
    top: '15%',
    halo: 20,
    coreStop: '12%',
    x: 36,
    y: 18,
    path: 'sway',
    driftDuration: 9.5,
    pulseDuration: 2.4,
    driftDelay: -5.1,
    pulseDelay: -0.7,
    dim: '0.45',
    bright: '0.9',
    wideOnly: false,
  },
  {
    id: 'ridge',
    left: '56%',
    top: '30%',
    halo: 30,
    coreStop: '13%',
    x: -20,
    y: -48,
    path: 'rise',
    driftDuration: 11.5,
    pulseDuration: 4.8,
    driftDelay: -7.2,
    pulseDelay: -2.8,
    dim: '0.38',
    bright: '0.8',
    wideOnly: false,
  },
  {
    id: 'far-right-sky',
    left: '62%',
    top: '18%',
    halo: 24,
    coreStop: '13%',
    x: 24,
    y: -36,
    path: 'wander',
    driftDuration: 8.5,
    pulseDuration: 3.6,
    driftDelay: -1.9,
    pulseDelay: -1.3,
    dim: '0.42',
    bright: '0.84',
    wideOnly: false,
  },
  {
    id: 'step-low',
    left: '20%',
    top: '74%',
    halo: 22,
    coreStop: '14%',
    x: 32,
    y: -18,
    path: 'sway',
    driftDuration: 12,
    pulseDuration: 2.8,
    driftDelay: -4.8,
    pulseDelay: -2.1,
    dim: '0.4',
    bright: '0.78',
    wideOnly: true,
  },
  {
    id: 'gutter',
    left: '48%',
    top: '70%',
    halo: 28,
    coreStop: '11%',
    x: 16,
    y: -40,
    path: 'rise',
    driftDuration: 10,
    pulseDuration: 4.4,
    driftDelay: -6.1,
    pulseDelay: -0.5,
    dim: '0.36',
    bright: '0.76',
    wideOnly: true,
  },
  {
    id: 'lane-right',
    left: '68%',
    top: '64%',
    halo: 26,
    coreStop: '12%',
    x: -30,
    y: -24,
    path: 'wander',
    driftDuration: 13,
    pulseDuration: 3.1,
    driftDelay: -2.2,
    pulseDelay: -1.7,
    dim: '0.4',
    bright: '0.82',
    wideOnly: true,
  },
];

export const GachaFireflies = () => {
  return (
    <div className="gacha-fireflies" aria-hidden="true">
      {fireflies.map((firefly) => {
        const style: FireflyStyle = {
          left: firefly.left,
          top: firefly.top,
          width: firefly.halo,
          height: firefly.halo,
          animationDuration: `${firefly.driftDuration}s, ${firefly.pulseDuration}s`,
          animationDelay: `${firefly.driftDelay}s, ${firefly.pulseDelay}s`,
          '--firefly-x': `${firefly.x}px`,
          '--firefly-y': `${firefly.y}px`,
          '--firefly-core': firefly.coreStop,
          '--firefly-dim': firefly.dim,
          '--firefly-bright': firefly.bright,
        };

        const className = [
          'gacha-firefly',
          pathClassName[firefly.path],
          firefly.wideOnly ? 'gacha-firefly--wide' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return <span key={firefly.id} className={className} style={style} />;
      })}
    </div>
  );
};
