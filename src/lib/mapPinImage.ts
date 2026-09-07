type PinImage = {
  image: { width: number; height: number; data: Uint8Array }
  options: { pixelRatio: number }
}

function toStyleImage(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, pixelRatio: number): PinImage {
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return {
    image: {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(pixels.data),
    },
    options: { pixelRatio },
  }
}

function emptyPin(width: number, height: number, pixelRatio: number): PinImage {
  return {
    image: {
      width: width * pixelRatio,
      height: height * pixelRatio,
      data: new Uint8Array(width * height * pixelRatio * pixelRatio * 4),
    },
    options: { pixelRatio },
  }
}

function withCanvas(width: number, height: number, pixelRatio: number, draw: (ctx: CanvasRenderingContext2D) => void): PinImage {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return emptyPin(width, height, pixelRatio)
    ctx.scale(pixelRatio, pixelRatio)
    draw(ctx)
    return toStyleImage(canvas, ctx, pixelRatio)
  } catch {
    return emptyPin(width, height, pixelRatio)
  }
}

export function createMapPinImage(fill = '#c49a3c', stroke = '#5c3d12') {
  const width = 40
  const height = 52
  const pixelRatio = 2
  return withCanvas(width, height, pixelRatio, (ctx) => {
    const cx = width / 2
    const headY = 15
    const headR = 13
    const tipY = height - 3

    ctx.fillStyle = 'rgba(28, 25, 23, 0.28)'
    ctx.beginPath()
    ctx.ellipse(cx, tipY, 7, 2.4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(cx, tipY)
    ctx.bezierCurveTo(cx - 1.8, tipY - 10, cx - headR, headY + 11, cx - headR, headY)
    ctx.arc(cx, headY, headR, Math.PI, 0, false)
    ctx.bezierCurveTo(cx + headR, headY + 11, cx + 1.8, tipY - 10, cx, tipY)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineJoin = 'round'
    ctx.lineWidth = 1.6
    ctx.strokeStyle = stroke
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, headY, 5.2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  })
}

export function createPushPinImage(
  head: [string, string, string, string] = ['#ff7a7a', '#ef233c', '#c1121f', '#6a040f'],
) {
  const width = 36
  const height = 56
  const pixelRatio = 2
  return withCanvas(width, height, pixelRatio, (ctx) => {
    const cx = width / 2
    const ballR = 11.5
    const ballY = 13.5
    const stemTop = ballY + 6
    const stemBottom = height - 2
    const stemW = 3.4

    ctx.fillStyle = 'rgba(28, 25, 23, 0.22)'
    ctx.beginPath()
    ctx.ellipse(cx, stemBottom, 5.5, 1.8, 0, 0, Math.PI * 2)
    ctx.fill()

    const stem = ctx.createLinearGradient(cx - stemW, 0, cx + stemW, 0)
    stem.addColorStop(0, '#7b818c')
    stem.addColorStop(0.28, '#f7f8fa')
    stem.addColorStop(0.55, '#c8ced6')
    stem.addColorStop(1, '#5f6670')
    ctx.fillStyle = stem
    ctx.fillRect(cx - stemW / 2, stemTop, stemW, stemBottom - stemTop)

    const ball = ctx.createRadialGradient(cx - 4, ballY - 4.5, 1.5, cx + 1, ballY + 2, ballR)
    ball.addColorStop(0, head[0])
    ball.addColorStop(0.28, head[1])
    ball.addColorStop(0.72, head[2])
    ball.addColorStop(1, head[3])
    ctx.beginPath()
    ctx.arc(cx, ballY, ballR, 0, Math.PI * 2)
    ctx.fillStyle = ball
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(cx - 3.8, ballY - 4.2, 3.4, 2.5, -0.55, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
    ctx.fill()
  })
}

export const REPORT_OPEN_PIN = 'report-status-open'
export const REPORT_SOLVED_PIN = 'report-status-solved'
export const REPORT_CLUSTER_PIN = 'report-status-cluster'

const OPEN_HEAD: [string, string, string, string] = ['#ff7a7a', '#ef233c', '#c1121f', '#6a040f']
const SOLVED_HEAD: [string, string, string, string] = ['#86efac', '#22c55e', '#15803d', '#14532d']

export function reportPinId(status: string) {
  return status === 'resolved' || status === 'closed' ? REPORT_SOLVED_PIN : REPORT_OPEN_PIN
}

export function reportPinImages() {
  return {
    [REPORT_OPEN_PIN]: createPushPinImage(OPEN_HEAD),
    [REPORT_SOLVED_PIN]: createPushPinImage(SOLVED_HEAD),
    [REPORT_CLUSTER_PIN]: createPushPinImage(OPEN_HEAD),
  }
}

export function reportPinImageExpression() {
  return ['match', ['get', 'pin_image'], REPORT_SOLVED_PIN, REPORT_SOLVED_PIN, REPORT_OPEN_PIN] as [
    'match',
    ['get', string],
    string,
    string,
    string,
  ]
}
