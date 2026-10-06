"""Run inside the Higgsfield sandbox after copying in an approved job manifest.

Usage: python3 higgsfield-video-delivery.py manifest.json output-directory
Requires the sandbox's ffmpeg, ffprobe, Pillow and native Higgsedit CLI.
The caller reserves and uploads the resulting ZIP before the sandbox expires.
"""

import concurrent.futures
import json
import pathlib
import subprocess
import sys
import urllib.request
import zipfile

from PIL import Image, ImageDraw

manifest = json.loads(pathlib.Path(sys.argv[1]).read_text())
root = pathlib.Path(sys.argv[2]).resolve()
root.mkdir(parents=True, exist_ok=True)
sources = root.parent / 'source-clips'
sources.mkdir(exist_ok=True)


def run(args):
    subprocess.run(args, check=True)


def room_clip(job):
    source = sources / f'{job["index"]}.mp4'
    urllib.request.urlretrieve(job['result_url'], source)
    out = root / job['floor'] / f'{job["room"]}-modern.mp4'
    out.parent.mkdir(exist_ok=True)
    # Contain preserves every photographed opening, including portrait entry/bath.
    run(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:v:0', '-an',
         '-t', str(job['duration']), '-vf',
         'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,'
         'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24',
         '-c:v', 'libx264', '-preset', 'medium', '-threads', '2', '-b:v', '6M',
         '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p',
         '-movflags', '+faststart', '-y', str(out)])
    print(f'EXPORTED {job["floor"]}/{out.name}', flush=True)


if '--reuse-clips' in sys.argv:
    assert json.loads((root / 'source-jobs.json').read_text()) == manifest
else:
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(room_clip, manifest['jobs']))

qa = root / 'qa'
qa.mkdir(exist_ok=True)
for floor, order in manifest['tourOrder'].items():
    timeline = []
    at = 0
    for index, room in enumerate(order):
        job = next(j for j in manifest['jobs'] if j['room'] == room)
        duration = min(job['duration'], 6.5) if floor == 'third-floor' else job['duration']
        timeline.append({'file': str(root / floor / f'{room}-modern.mp4'),
                         'name': room, 'at': at, 'dur': duration})
        at += duration - 0.5
    project = root.parent / f'project-{floor}'
    script = root / floor / 'tour-modern.jsx'
    script.write_text('''export default async ({ project }) => {
  const p = await project({ dir: PROJECT_DIR, size: '1920x1080', fps: 24, background: '#000000' });
  const shots = SHOTS;
  const files = [];
  for (const shot of shots) files.push(await p.add(shot.file));
  // One parent keeps later shots above earlier shots at every dissolve.
  p.compose(<frame width={1920} height={1080} layout="none">{shots.map((shot, i) =>
    <media file={files[i]} x={0} y={0} width={1920} height={1080} fit="contain"
      at={shot.at} duration={shot.dur}
      animate={i ? [{ property: 'opacity', from: 0, to: 1, at: 0, duration: 0.5, easing: 'linear' }] : []} />
  )}</frame>, { at: 0, dur: shots.at(-1).at + shots.at(-1).dur });
  await p.render(OUTPUT, { depth: 8, bitrate: 4500000, concurrency: 2 });
};
'''.replace('PROJECT_DIR', json.dumps(str(project)))
     .replace('SHOTS', json.dumps(timeline))
     .replace('OUTPUT', json.dumps(str(root / floor / 'tour-modern.mp4'))))
    run(['higgsedit', 'build', str(script)])
    run(['higgsedit', 'check', str(project)])
    # Three frames around each dissolve plus first/last frames for visual review.
    times = [0.2]
    for shot in timeline[1:]:
        times.extend([shot['at'] - 0.1, shot['at'] + 0.25, shot['at'] + 0.6])
    times.append(at + 0.3)
    sheet = Image.new('RGB', (1200, ((len(times) + 2) // 3) * 245), '#161616')
    for n, t in enumerate(times):
        frame = qa / f'{floor}-{n}.jpg'
        run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(root / floor / 'tour-modern.mp4'),
             '-frames:v', '1', '-vf', 'scale=400:225', '-y', str(frame)])
        x, y = (n % 3) * 400, (n // 3) * 245
        ImageDraw.Draw(sheet).text((x + 4, y + 3), f'{floor} {t:.2f}s', fill='white')
        sheet.paste(Image.open(frame), (x, y + 20))
        frame.unlink()
    sheet.save(qa / f'{floor}-tour.jpg', quality=70)
    print(f'TOUR {floor}: {at + 0.5:.1f}s', flush=True)

metadata = []
for path in sorted(root.glob('*/*.mp4')):
    probe = json.loads(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    assert len(probe['streams']) == 1, f'Unexpected audio or extra stream: {path}'
    video = probe['streams'][0]
    assert (video['codec_name'], video['width'], video['height'], video['r_frame_rate']) == ('h264', 1920, 1080, '24/1')
    duration = float(probe['format']['duration'])
    assert 20 <= duration <= 40 if path.name.startswith('tour-') else 5 <= duration <= 8.01
    assert path.stat().st_size <= 25_000_000, f'File exceeds 25 MB: {path}'
    metadata.append({'file': str(path.relative_to(root)), 'duration': duration,
                     'bytes': path.stat().st_size, 'width': 1920, 'height': 1080,
                     'fps': 24, 'codec': 'h264', 'audioStreams': 0})
(root / 'delivery-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
(root / 'source-jobs.json').write_text(json.dumps(manifest, indent=2) + '\n')
with zipfile.ZipFile(root.with_suffix('.zip'), 'w', compression=zipfile.ZIP_STORED) as archive:
    for path in root.rglob('*'):
        if path.is_file():
            archive.write(path, path.relative_to(root))
print('COMPLETE', str(root.with_suffix('.zip')), flush=True)
