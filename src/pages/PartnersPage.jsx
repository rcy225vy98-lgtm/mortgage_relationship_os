import PartnerScorecard from '../components/PartnerScorecard'

function PartnersPage({ partnerRows, partnerProfiles, onOpenPartner }) {
  return <PartnerScorecard partnerRows={partnerRows} partnerProfiles={partnerProfiles} onOpenPartner={onOpenPartner} />
}

export default PartnersPage
