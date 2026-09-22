import { useState } from 'react'
import { Boxes, Sparkles, Music, Layers, Palette, Film, Download } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { assets } from '../data/mock'

const types = [
  { name: 'Mesh', icon: Boxes, desc: '3D props and characters, game-ready topology' },
  { name: 'Texture', icon: Palette, desc: 'Tileable PBR textures up to 2048px' },
  { name: 'Material', icon: Layers, desc: 'Complete material sets with normal maps' },
  { name: 'Audio', icon: Music, desc: 'Sound effects and short music loops' },
  { name: 'Animation', icon: Film, desc: 'R15 animations from a text description' },
]

export default function Assets() {
  const [type, setType] = useState('Mesh')
  const [quality, setQuality] = useState('Draft')

  return (
    <div>
      <PageHeader title="Asset Generation" subtitle="Generate meshes, textures, audio and animations and publish them to your inventory" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="Asset type">
            <div className="space-y-2">
              {types.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setType(t.name)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${type === t.name ? 'border-accent bg-accent-soft' : 'border-line hover:bg-panel-2'}`}
                >
                  <t.icon size={16} className={type === t.name ? 'text-accent mt-0.5' : 'text-muted mt-0.5'} />
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card title={`Generate a ${type.toLowerCase()}`} subtitle="Draft quality is free while you iterate" className="lg:col-span-2">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted mb-1.5">Description</div>
              <textarea className="input h-24 resize-none" defaultValue="Ancient stone sword with glowing blue runes, low poly, fits a fantasy obby" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted mb-1.5">Quality</div>
                <Segmented options={['Draft', 'Standard', 'High']} value={quality} onChange={setQuality} />
              </div>
              <div>
                <div className="text-xs text-muted mb-1.5">Target polycount</div>
                <select className="input"><option>Under 2k tris (mobile safe)</option><option>2k to 8k tris</option><option>8k+ tris</option></select>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-line p-8 text-center">
              <Boxes size={28} className="mx-auto text-muted" />
              <div className="mt-2 text-sm">3D preview will render here</div>
              <div className="text-xs text-muted">Orbit, inspect wireframe and check the collision box before publishing</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary"><Sparkles size={14} />Generate</button>
              <button className="btn">Save preset</button>
              <span className="ml-auto text-xs text-muted self-center">{quality === 'Draft' ? 'Free' : quality === 'Standard' ? '2 credits' : '5 credits'}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Your library" subtitle="Generated assets ready to publish to Roblox">
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Type</th><th>Details</th><th>Created</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.name}>
                  <td className="font-medium">{a.name}</td>
                  <td><Badge tone="accent">{a.type}</Badge></td>
                  <td className="text-muted">{a.size}</td>
                  <td className="text-muted">{a.created}</td>
                  <td><Badge tone={a.status === 'Ready' ? 'good' : 'warn'}>{a.status}</Badge></td>
                  <td className="text-right"><button className="btn px-2 py-1 text-xs"><Download size={12} />Publish</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
