import { CharityOption } from '@/types'

/**
 * Derive cryptoSupport from cryptoDonationURL presence
 * This enforces the rule: cryptoSupport is true ONLY if cryptoDonationURL exists
 */
function deriveCryptoSupport(charity: Omit<CharityOption, 'cryptoSupport'>): boolean | null {
  if (charity.cryptoDonationURL && charity.cryptoDonationURL.trim() !== '') {
    return true
  }
  // For custom charity, return null (user determines)
  if (charity.id === 'custom_charity') {
    return null
  }
  return false
}

/**
 * Charity data with crypto support derived from cryptoDonationURL presence.
 * cryptoSupport is true ONLY if cryptoDonationURL exists; otherwise false or null.
 */
const charityData: Array<Omit<CharityOption, 'cryptoSupport'>> = [
  {
    id: 'st_jude',
    name: 'St. Jude Children\'s Research Hospital',
    ein: '62-0646012',
    missionCategory: 'Children & Families',
    websiteURL: 'https://www.stjude.org/',
    donationURL: 'https://www.stjude.org/donate/crypto.html',
    cryptoDonationURL: 'https://www.stjude.org/donate/crypto.html',
    logoAssetPath: '/charities/st_jude.svg',
    logoSourceURL: 'https://design.stjude.cloud/components/detail/st-jude-childrens-vertical.html',
    notes: 'Official crypto donation page',
  },
  {
    id: 'save_the_children',
    name: 'Save the Children (U.S.)',
    ein: '06-0726487',
    missionCategory: 'Children & Families',
    websiteURL: 'https://www.savethechildren.org/',
    donationURL: 'https://www.savethechildren.org/us/ways-to-help/ways-to-give/cryptocurrency-donation',
    cryptoDonationURL: 'https://www.savethechildren.org/us/ways-to-help/ways-to-give/cryptocurrency-donation',
    logoAssetPath: '/charities/save_the_children.svg',
    logoSourceURL: 'https://www.savethechildren.org.cn/upload/file/20200511/1589180164114012.pdf',
    notes: 'Crypto via official Giving Block integration',
  },
  {
    id: 'feeding_america',
    name: 'Feeding America',
    ein: '36-3673599',
    missionCategory: 'Hunger Relief',
    websiteURL: 'https://www.feedingamerica.org/',
    donationURL: 'https://www.feedingamerica.org/ways-to-give/bitcoin-cryptocurrency',
    cryptoDonationURL: 'https://www.feedingamerica.org/ways-to-give/bitcoin-cryptocurrency',
    logoAssetPath: '/charities/feeding_america.svg',
    logoSourceURL: 'https://www.feedingamerica.org/partner-resource-page',
  },
  {
    id: 'americares',
    name: 'Americares',
    ein: '06-1008595',
    missionCategory: 'Health & Medical',
    websiteURL: 'https://www.americares.org/',
    donationURL: 'https://www.americares.org/take-action/ways-to-give/cryptocurrency-donations/',
    cryptoDonationURL: 'https://www.americares.org/take-action/ways-to-give/cryptocurrency-donations/',
    logoAssetPath: '/charities/americares.svg',
    logoSourceURL: 'https://www.americares.org/prev-newsroom/media-center/',
  },
  {
    id: 'habitat_for_humanity',
    name: 'Habitat for Humanity International',
    ein: '91-1914868',
    missionCategory: 'Housing & Shelter',
    websiteURL: 'https://www.habitat.org/',
    donationURL: 'https://www.habitat.org/support/cryptocurrency-donations',
    cryptoDonationURL: 'https://www.habitat.org/support/cryptocurrency-donations',
    logoAssetPath: '/charities/habitat.svg',
    logoSourceURL: 'https://habitatcaz.org/wp-content/uploads/2024/09/habitat-designers-guide-to-branding.pdf',
  },
  {
    id: 'uso',
    name: 'United Service Organizations (USO)',
    ein: '13-1610451',
    missionCategory: 'Military & Veterans',
    websiteURL: 'https://www.uso.org/',
    donationURL: 'https://www.uso.org/take-action/donate-cryptocurrency',
    cryptoDonationURL: 'https://www.uso.org/take-action/donate-cryptocurrency',
    logoAssetPath: '/charities/uso.svg',
    logoSourceURL: 'https://www.uso.org/brandroom/design-guide',
  },
  {
    id: 'blood_cancer_united',
    name: 'Blood Cancer United',
    ein: '13-5644916',
    missionCategory: 'Health & Medical',
    websiteURL: 'https://bloodcancerunited.org/',
    donationURL: 'https://bloodcancerunited.org/get-involved/ways-to-give/donate-cryptocurrency',
    cryptoDonationURL: 'https://bloodcancerunited.org/get-involved/ways-to-give/donate-cryptocurrency',
    logoAssetPath: '/charities/blood_cancer_united.svg',
    logoSourceURL: 'https://bloodcancerunited.org/about-us/financials',
  },
  {
    id: 'march_of_dimes',
    name: 'March of Dimes',
    ein: '13-1846366',
    missionCategory: 'Health & Medical',
    websiteURL: 'https://www.marchofdimes.org/',
    donationURL: 'https://www.marchofdimes.org/ways-to-give/donate-crypto',
    cryptoDonationURL: 'https://www.marchofdimes.org/ways-to-give/donate-crypto',
    logoAssetPath: '/charities/march_of_dimes.svg',
    logoSourceURL: 'https://www.marchofdimes.org/provider-set-up',
  },
  {
    id: 'american_red_cross',
    name: 'American Red Cross',
    ein: '53-0196605',
    missionCategory: 'Humanitarian Aid',
    websiteURL: 'https://www.redcross.org/',
    donationURL: 'https://www.redcross.org/donate/donation.html',
    // No cryptoDonationURL - fiat only
    logoAssetPath: '/charities/red_cross.svg',
    logoSourceURL: 'https://redcrosslegacy.org/advisor-faqs',
  },
  {
    id: 'custom_charity',
    name: 'Custom Charity (User Entered)',
    ein: null,
    missionCategory: 'Custom',
    websiteURL: '',
    donationURL: '',
    // No cryptoDonationURL - user fills manually
    logoAssetPath: '/charities/custom_charity.svg',
    logoSourceURL: '',
    notes: 'User manually fills all fields',
  },
]

// Derive cryptoSupport for each charity based on cryptoDonationURL presence
export const charities: CharityOption[] = charityData.map(charity => ({
  ...charity,
  cryptoSupport: deriveCryptoSupport(charity),
}))

/**
 * Get charity by ID
 */
export function getCharityById(id: string): CharityOption | undefined {
  return charities.find((c) => c.id === id)
}

/**
 * Export the derive function for use in components
 */
export { deriveCryptoSupport }
