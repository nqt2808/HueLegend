import React from 'react';
import { Batch } from '../types';
import { ROLE_HASHES } from '../constants';
import { readGps } from '../../api/supply-ledger-core.js';

export const RouteMap: React.FC<{ batch: Batch }> = ({ batch }) => {
  const points = (batch.checkpoints || []).filter(cp => cp.role === ROLE_HASHES.ROLE_LOGISTICS)
    .map(cp => ({ ...cp, gps: readGps(cp.location) })).filter(item => item.gps !== null);
  if (points.length === 0) return <div className="border rounded-xl p-3 text-xs bg-[#FAF9F5] text-[#5E7166]">
    <strong>Bản đồ hành trình:</strong> chưa có GPS được ghi trong checkpoint vận chuyển. Đơn vị vận chuyển có thể nhập toạ độ thực hoặc cho phép định vị khi thêm chặng mới.
  </div>;
  const latitudes = points.map(item => item.gps!.latitude);
  const longitudes = points.map(item => item.gps!.longitude);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes); const maxLng = Math.max(...longitudes);
  const toX = (lng: number) => 30 + (lng - minLng) / Math.max(maxLng - minLng, 0.0005) * 440;
  const toY = (lat: number) => 190 - (lat - minLat) / Math.max(maxLat - minLat, 0.0005) * 160;
  const path = points.map(item => `${toX(item.gps!.longitude)},${toY(item.gps!.latitude)}`).join(' ');
  const latest = points[points.length - 1].gps!;
  const delta = 0.025;
  const bbox = [latest.longitude - delta, latest.latitude - delta, latest.longitude + delta, latest.latitude + delta].join('%2C');
  const osmURL = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latest.latitude}%2C${latest.longitude}`;
  const externalURL = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;
  return <section className="border rounded-xl p-3 bg-[#FAF9F5] space-y-3" data-testid="transport-route-map">
    <h4 className="font-bold text-[#264939] text-sm">Bản đồ hành trình vận chuyển ({points.length} điểm GPS)</h4>
    <iframe title="Bản đồ OpenStreetMap của điểm vận chuyển mới nhất" loading="lazy" referrerPolicy="no-referrer" className="w-full h-60 rounded-lg border" src={osmURL} />
    <p className="text-[11px] text-[#5E7166]">Bản đồ OpenStreetMap đang hiển thị điểm GPS mới nhất. Sơ đồ bên dưới nối các điểm đã ghi on-chain theo thứ tự thời gian; không phải tuyến đường ô tô thực tế.</p>
    {points.length > 1 && <svg viewBox="0 0 500 220" role="img" aria-label="Sơ đồ các điểm GPS theo thứ tự checkpoint" className="w-full rounded-lg bg-[#E0ECE4] border">
      <polyline points={path} fill="none" stroke="#264939" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((item, index) => <g key={`${item.timestamp}-${index}`}>
        <circle cx={toX(item.gps!.longitude)} cy={toY(item.gps!.latitude)} r="11" fill="#C29B38" stroke="#264939" strokeWidth="1.5" />
        <text x={toX(item.gps!.longitude)} y={toY(item.gps!.latitude) + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">{index + 1}</text>
      </g>)}
    </svg>}
    <ol className="space-y-1 text-xs list-decimal pl-5">
      {points.map((item, index) => <li key={`${index}-${item.timestamp}`}>
        <a className="underline text-[#264939]" target="_blank" rel="noopener noreferrer" href={externalURL(item.gps!.latitude, item.gps!.longitude)}>{item.gps!.label || 'Điểm vận chuyển'}</a>
        <span className="text-[#5E7166]"> — {item.gps!.latitude.toFixed(6)}, {item.gps!.longitude.toFixed(6)} · {new Date(item.timestamp * 1000).toLocaleString('vi-VN')}</span>
      </li>)}
    </ol>
  </section>;
};
