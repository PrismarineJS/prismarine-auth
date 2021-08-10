/// <reference types="node" />

declare module 'prismarine-auth' {
    export class MicrosoftAuthFlow {
        constructor(username: string, cache: string, options?: MicrosoftAuthFlowOptions, codeCallback?: Function)
        initTokenCaches?: (username: string, cache: string) => void
        resetTokenCaches?: (cache: string) => boolean
        getMsaToken?: () => string
        getXboxToken?: () => string
        getMinecraftJavaToken?: (MinecraftJavaToken: object) => string
        getMinecraftBedrockToken?: (publicKey: string) => string
    }
    export interface MinecraftJavaToken {
        fetchEntitlements: boolean = false
        fetchProfile: boolean = false
    }

    export interface MicrosoftAuthFlowOptions {
        relyingParty?: RelyingParty
        authTitle?: Titles
        password?: String
    }

    export enum Titles {
        MinecraftNintendoSwitch = '00000000441cc96b',
        MinecraftJava = '00000000402b5328'
    }

    export enum RelyingParty {
        PCXSTSRelyingParty = 'rp://api.minecraftservices.com/',
        BedrockXSTSRelyingParty = 'https://multiplayer.minecraft.net/',
        XboxXSTSRelyingParty = 'http://auth.xboxlive.com/'
    }

}