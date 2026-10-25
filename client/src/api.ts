export async function api(path: string, body?: unknown) {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error + (data.details ? ' — check the entered fields.' : ''));
  return data;
}

export const time = (date: string) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function left(date: string) {
  const minutes = Math.max(0, Math.floor((+new Date(date) - Date.now()) / 60000));
  if (!minutes) return 'Deadline passed';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m left` : `${mins}m left`;
}

export function relativeTime(date: string | Date | number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d ago`;
}

export const photo = (name = 'Wedding') => {
  const lower = name.toLowerCase();
  if (lower.includes('sangeet') || lower.includes('banquet')) {
    return 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('concert')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('birthday')) {
    return 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('corporate') || lower.includes('office')) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=85';
};
