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
    phone: '800-822-6344',
    email: 'donors@stjude.org',
    address: '501 St. Jude Place',
    city: 'Memphis',
    state: 'TN',
    zipCode: '38105',
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
    phone: '800-728-3843',
    email: 'info@savethechildren.org',
    address: '501 Kings Highway East',
    city: 'Fairfield',
    state: 'CT',
    zipCode: '06825',
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
    phone: '800-771-2303',
    email: 'info@feedingamerica.org',
    address: '161 North Clark Street',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
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
    phone: '800-486-4357',
    email: 'info@americares.org',
    address: '88 Hamilton Avenue',
    city: 'Stamford',
    state: 'CT',
    zipCode: '06902',
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
    phone: '800-422-4828',
    email: 'info@habitat.org',
    address: '322 West Lamar Street',
    city: 'Americus',
    state: 'GA',
    zipCode: '31709',
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
    phone: '888-484-3876',
    email: 'info@uso.org',
    address: '2111 Wilson Boulevard',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22201',
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
    phone: '800-955-4572',
    email: 'info@bloodcancerunited.org',
    address: '3 International Drive',
    city: 'Rye Brook',
    state: 'NY',
    zipCode: '10573',
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
    phone: '888-663-4637',
    email: 'askus@marchofdimes.org',
    address: '1550 Crystal Drive',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22202',
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
    phone: '800-733-2767',
    email: 'info@redcross.org',
    address: '431 18th Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20006',
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
    // No contact info for custom charity
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
