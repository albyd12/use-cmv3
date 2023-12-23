import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createNoopSigner, publicKey, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { WalletContextState } from '@solana/wallet-adapter-react'

export const createUmiWithSigners = (endpoint: string, wallet: WalletContextState) => {
  const umi = createUmi(endpoint).use(mplTokenMetadata()).use(mplCandyMachine())
  if (wallet.publicKey === null) {
    const noopSigner = createNoopSigner(publicKey('11111111111111111111111111111111'))
    umi.use(signerIdentity(noopSigner))
  } else {
    umi.use(walletAdapterIdentity(wallet))
  }
  return umi
}
