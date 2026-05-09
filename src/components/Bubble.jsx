export default function Bubble({ m }) {
  return (
    <div className={`bubble ${m.role}`}>
      <div className="role">{m.role === 'ai' ? 'AGENT' : 'YOU'}</div>
      <div>{m.text}</div>
      {m.json && <pre className="json">{m.json}</pre>}
      {m.card && (
        <div className="card-out">
          {m.card.map((row, i) => (
            <div className="row-c" key={i}>
              <span>{row[0]}</span>
              <b>{row[1]}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
