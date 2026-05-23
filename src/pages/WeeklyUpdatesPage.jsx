import WeeklyUpdateGenerator from '../components/WeeklyUpdateGenerator'

function WeeklyUpdatesPage({
  partners,
  selectedPartner,
  setSelectedPartner,
  updateText,
  copyUpdate,
}) {
  return (
    <WeeklyUpdateGenerator
      partners={partners}
      selectedPartner={selectedPartner}
      setSelectedPartner={setSelectedPartner}
      updateText={updateText}
      copyUpdate={copyUpdate}
    />
  )
}

export default WeeklyUpdatesPage
