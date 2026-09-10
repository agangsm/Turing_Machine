import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://turingmachine.info/api/api.php';

export async function GET(request: NextRequest) {
  const hash = (request.nextUrl.searchParams.get('hash') ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const n = Math.min(6, Math.max(4, Number(request.nextUrl.searchParams.get('n') ?? 4)));
  const difficulty = Math.min(2, Math.max(0, Number(request.nextUrl.searchParams.get('d') ?? 1)));
  const query = hash ? `h=${encodeURIComponent(hash)}` : `m=0&d=${difficulty}&n=${n}`;
  const uuid = crypto.randomUUID().replaceAll('-', '');

  try {
    const upstream = await fetch(`${API_URL}?uuid=${uuid}&${query}`, {
      headers: {
        Referer: 'https://www.turingmachine.info/',
        Origin: 'https://www.turingmachine.info',
        'User-Agent': 'Mozilla/5.0 TuringMachineSolo/1.0',
      },
      cache: 'no-store',
    });
    const data = await upstream.json() as Record<string, unknown>;
    if (!upstream.ok || data.status !== 'ok') {
      return NextResponse.json({ status: 'bad', message: '没有找到这个挑战代码。' }, { status: 404 });
    }
    return NextResponse.json({
      status: 'ok', hash: String(data.hash), n: Number(data.n), code: Number(data.code), par: Number(data.par),
      ind: (data.ind as unknown[]).map(Number), law: (data.law as unknown[]).map(Number),
      crypt: (data.crypt as unknown[]).map(Number), color: Number(data.color), source: 'official',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'error', message: '暂时无法连接题库，请稍后再试。' }, { status: 502 });
  }
}
