# use-cmv3
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

React library enabling you to interact with the [Metaplex candy machine](https://mpl-candy-machine-js-docs.vercel.app/)

(This library currently only supports the following guards
`solPayment` `allowList` `mintLimit` `startDate` `endDate`)

> **Demo: [Cmv3 Frontend](https://github.com/0xalby/cmv3-frontend)**

### Todo:
 - [ ] Support all guards
 - [ ] Multi-Mint

  
## Installation
```bash
npm install \
  "use-cmv3" \
  "@metaplex-foundation/mpl-candy-machine" \
  "@metaplex-foundation/mpl-token-metadata" \
  "@metaplex-foundation/mpl-toolbox" \
  "@metaplex-foundation/umi" \
  "@metaplex-foundation/umi-bundle-defaults" \
  "@metaplex-foundation/umi-rpc-web3js" \
  "@metaplex-foundation/umi-signer-wallet-adapters" \
  "@metaplex-foundation/umi-uploader-nft-storage" \
  "@solana/wallet-adapter-base" \
  "@solana/wallet-adapter-react" \
  "@solana/wallet-adapter-react-ui" \
  "@solana/wallet-adapter-wallets" \
  "@solana/web3.js"
```

###  Using inside your project

Add the following to your `.env` file
```
NEXT_PUBLIC_CANDY_MACHINE_ID={your_cm_id},
NEXT_PUBLIC_CANDY_MACHINE_LUT={your_cm_lut},
NEXT_PUBLIC_ENDPOINT={your_endpoint},
```

Wrap necessary components within `Cmv3Provider`, ensuring that [WalletAdapter](https://github.com/solana-labs/wallet-adapter) is an ancestor.
```ts
import { WalletProvider } from  '@solana/wallet-adapter-react'
import { Cmv3Provider } from 'use-cmv3'

export default function App({children}) {
    
    /* wallet adapter stuff */
    
    const  allowLists  =  new  Map<string, Array<string>>([['OGs', ['61DZsc2GKvgygUMgmNcYmT2jVjdJmxWEiPyn3nfJW3Td']]])
    
    return (
        <WalletProvider>
            <Cmv3Provider>
                {children}
            </Cmv3Provider>
         </WalletProvider>
    )
}
```
You can now call `useCmv3()` inside wrapped components.
```typescript
import { useCmv3 } from 'use-cmv3'

export  default  function  Mint() {

    const cmv3 = useCmv3()
    
    return (
        <main>
        
            <h1>Mint Page!</h1>
        
            <Counter
                value={mintCounter.sold} 
                maxValue={mintCounter.supply}
            />
            
            <Phases>
                {cmv3.phases.map(phase => (
                    <Phases.Phase phase={phase}/>
                ))}
            </Phases
        </main>
    
    )
}
```

## Context Values
 
 Values returned by `useCmv3()`

|Name | Type | Description | Default |
|--|--|--|--|
| loading | `{ candyMachine: boolean, phases: boolean}`  | Loading values for the whole candyMachine or just phases | `{ candyMachine: true, phases: true }` |
| candyMachine? | `CandyMachine | undefined` | Returns the initialised candy machine if applicable | `undefined` |
| candyGuard? | `CandyGuard | undefined` | Returns the initialised candy machines guard if applicable | `undefined` |
| phases | `Phase[]`| Array of phases relative to the connected wallet | `[]` |
| mintCounter | `{ supply: number; sold: number; }` | Exposes sold/supply statistics of candy machine | `{ supply: 0; sold: 0 }` |
| minting | `string | false ` | Label of the phase user is currently minting | `false` |
| mint | `(label: string) => Promise<void>` | Function to mint a phase with label |  |
| mints | `{ mints: string; metadata: JsonMetadata | undefined }[]` | Array of NFTs minted by user | [] |

### Phases:

Phases are an interpolation of candy guard groups.

| Name | Type | Description |
|--|--|--|
| label | `string` | Label of the guard candy guard group |
| errors | `string[]` | Guards stopping the user from minting |
| payments | `{ basisPoints:  number; decimals:  number; identifier:  string; }` | Payment guards formatted into Payment |
| startsAt? | `number | undefined` | UNIX timestamp of the phases start date |
| endsAt? | `number | undefined` | UNIX timestamp of the phases end date

## Notes

This library is un-audited and not affiliated with Solana or Metaplex.

Big thanks to [MarkSackerberg](https://github.com/MarkSackerberg) who's work I often referenced while creating this library.

