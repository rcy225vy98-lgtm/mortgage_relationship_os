import PartnerScorecard from '../components/PartnerScorecard'

function PartnersPage({ partnerRows, onOpenPartner }) {
  return <PartnerScorecard partnerRows={partnerRows} onOpenPartner={onOpenPartner} />
}

export default PartnersPage
