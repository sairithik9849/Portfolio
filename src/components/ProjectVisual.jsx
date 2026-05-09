import VizAero from './visuals/VizAero'
import VizMF   from './visuals/VizMF'
import VizSPP  from './visuals/VizSPP'
import VizLL   from './visuals/VizLL'
import VizWB   from './visuals/VizWB'
import VizSCH  from './visuals/VizSCH'

const VIZ = { aero: VizAero, mf: VizMF, spp: VizSPP, ll: VizLL, wb: VizWB, sch: VizSCH }

export default function ProjectVisual({ kind, p }) {
  const Viz = VIZ[kind]
  return (
    <div className="pj-visual">
      <div className="pv-head">
        <span>// {p.num} · {p.name.toUpperCase()}</span>
        <span>VIZ</span>
      </div>
      <div className="pv-body">
        {Viz && <Viz />}
      </div>
    </div>
  )
}
