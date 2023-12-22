import { PublicKey, Umi } from '@metaplex-foundation/umi'
import {
  DigitalAsset,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from '@metaplex-foundation/mpl-token-metadata'

export const fetchNft = async (umi: Umi, nftAdress: PublicKey) => {
  let digitalAsset: DigitalAsset | undefined
  let jsonMetadata: JsonMetadata | undefined
  try {
    digitalAsset = await fetchDigitalAsset(umi, nftAdress)
    jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri)
  } catch (error) {
    console.error(error)
    console.warn('Could not fetch NFT')
  }

  return { digitalAsset, jsonMetadata }
}
