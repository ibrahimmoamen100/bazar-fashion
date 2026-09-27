import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url')?.trim();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // 1. YouTube
    if (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
          { signal: AbortSignal.timeout(3500) }
        );

        if (oembedRes.ok) {
          const data = await oembedRes.json();
          const authorUrl = (data.author_url || '').trim();
          const authorName = (data.author_name || '').trim();
          const handleMatch = authorUrl.match(/@([\w.-]+)/);
          const channelHandle = handleMatch?.[1] || '';

          const channelUrl = authorUrl || (channelHandle ? `https://www.youtube.com/@${channelHandle}` : videoUrl);
          const avatarUrl = channelHandle ? `https://unavatar.io/youtube/@${channelHandle}` : '';

          return NextResponse.json({
            platform: 'youtube',
            channelUrl,
            avatarUrl,
            channelHandle,
            authorName,
          });
        }
      } catch {
        // Fallback below
      }

      const handleMatch = videoUrl.match(/youtube\.com\/@([\w.-]+)/);
      const channelHandle = handleMatch?.[1] || '';
      return NextResponse.json({
        platform: 'youtube',
        channelUrl: channelHandle ? `https://www.youtube.com/@${channelHandle}` : videoUrl,
        avatarUrl: channelHandle ? `https://unavatar.io/youtube/@${channelHandle}` : '',
        channelHandle,
        authorName: channelHandle ? `@${channelHandle}` : '',
      });
    }

    // 2. TikTok
    if (videoUrl.includes('tiktok.com')) {
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
          { signal: AbortSignal.timeout(3500) }
        );

        if (oembedRes.ok) {
          const data = await oembedRes.json();
          const channelHandle = (data.author_unique_id || '').trim();
          const authorUrl = (data.author_url || '').trim();
          const authorName = (data.author_name || '').trim();
          const channelUrl = authorUrl || (channelHandle ? `https://www.tiktok.com/@${channelHandle}` : videoUrl);
          const avatarUrl = channelHandle ? `https://unavatar.io/tiktok/${channelHandle}` : '';

          return NextResponse.json({
            platform: 'tiktok',
            channelUrl,
            avatarUrl,
            channelHandle,
            authorName,
          });
        }
      } catch {
        // Fallback below
      }

      const userMatch = videoUrl.match(/tiktok\.com\/@([\w.]+)/);
      const channelHandle = userMatch?.[1] || '';
      return NextResponse.json({
        platform: 'tiktok',
        channelUrl: channelHandle ? `https://www.tiktok.com/@${channelHandle}` : videoUrl,
        avatarUrl: channelHandle ? `https://unavatar.io/tiktok/${channelHandle}` : '',
        channelHandle,
        authorName: channelHandle ? `@${channelHandle}` : '',
      });
    }

    // 3. Facebook
    if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
      const pageMatch = videoUrl.match(/facebook\.com\/([^/?#]+)/);
      const rawHandle = pageMatch?.[1] || '';
      const ignoredHandles = ['watch', 'reel', 'reels', 'share', 'stories', 'photo', 'video', 'videos', 'p'];
      const channelHandle = rawHandle && !ignoredHandles.includes(rawHandle.toLowerCase()) ? rawHandle : '';

      const channelUrl = channelHandle ? `https://www.facebook.com/${channelHandle}` : videoUrl;
      const avatarUrl = channelHandle
        ? `https://graph.facebook.com/${channelHandle}/picture?type=large`
        : 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/200px-Facebook_Logo_%282019%29.png';

      return NextResponse.json({
        platform: 'facebook',
        channelUrl,
        avatarUrl,
        channelHandle,
        authorName: channelHandle,
      });
    }

    return NextResponse.json({
      platform: 'unknown',
      channelUrl: videoUrl,
      avatarUrl: '',
      channelHandle: '',
      authorName: '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
