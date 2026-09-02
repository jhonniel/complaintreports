import { Link } from 'react-router-dom'
import { Info, Megaphone, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const uses = [
  {
    icon: Megaphone,
    text: 'Pagsumbong sa mga problema ug concern',
  },
  {
    icon: Users,
    text: 'Pagpaabot sa hinaing sa mga Kidapawenon',
  },
  {
    icon: Info,
    text: 'Paghatag og impormasyon nga may kalabotan sa komunidad',
  },
  {
    icon: ShieldCheck,
    text: 'Pagpaambit sa mga isyu nga angay mahibal-an sa publiko',
  },
]

export function AboutPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">
        Tingog Kidapawan
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Sumbungan sa Kidapawan</h1>
      <p className="mt-4 font-display text-xl font-medium text-pine-800 md:text-2xl">
        Para sa tanan. Para sa Kidapawenon. Para sa atong tingog.
      </p>

      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          Adunay reklamo, problema, o concern sa inyong barangay o sa Dakbayan sa Kidapawan?
          Ipaabot ang inyong tingog.
        </p>
        <p>Ang Tingog Kidapawan mahimong inyong lugar alang sa:</p>
      </div>

      <ul className="mt-6 grid gap-3">
        {uses.map((item) => (
          <li
            key={item.text}
            className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 shadow-card"
          >
            <item.icon className="mt-0.5 size-5 shrink-0 text-pine-700" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-ink-800 md:text-base">{item.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-700">
        <p>Walay gamay nga concern kung kini nakaapekto sa atong komunidad.</p>
        <p>
          Kung kamo adunay nakita, nasinati, o nahibal-an nga angay mahibal-an sa mga Kidapawenon,
          mahimo ninyo kami i-message. Atong paminawon, susihon, ug ipaabot ang mga tingog nga
          angay madungog.
        </p>
      </div>

      <div className="mt-8">
        <p className="mb-4 text-base leading-relaxed text-ink-700">
          I-message kami para sa inyong concerns, impormasyon, o sumbong.
        </p>
        <Link to="/submit">
          <Button>
            <MessageCircle className="size-4" />
            I-message kami
          </Button>
        </Link>
      </div>

      <p className="mt-8 rounded-lg border border-earth-500/25 bg-earth-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
        <span className="font-semibold text-ink-900">Pahinumdom: </span>
        Ang mga impormasyon nga ipadala mahimong susihon ug beripikahon una pa ipaabot sa publiko.
      </p>
    </article>
  )
}
