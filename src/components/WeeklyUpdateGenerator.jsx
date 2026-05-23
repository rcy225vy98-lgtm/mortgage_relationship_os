export default function WeeklyUpdateGenerator({ partners, selectedPartner, setSelectedPartner, updateText, copyUpdate }) {
  return (
    <div className="panel">
      <h2>Weekly Update Generator</h2>
      <p className="panel-subtitle">Pick a partner and copy a clean update.</p>
      <select className="full-select" value={selectedPartner} onChange={(event) => setSelectedPartner(event.target.value)}>
        {partners.filter((partner) => partner !== 'All Partners').map((partner) => (
          <option key={partner}>{partner}</option>
        ))}
      </select>
      <pre className="update-box">{updateText}</pre>
      <button className="secondary-button" onClick={copyUpdate}>Copy Update</button>
    </div>
  )
}
