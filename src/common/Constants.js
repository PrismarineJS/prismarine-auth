module.exports = {
  Endpoints: {
    minecraftJava: {
      XSTSRelyingParty: 'rp://api.minecraftservices.com/',
      loginWithXbox: 'https://api.minecraftservices.com/authentication/login_with_xbox',
      profile: 'https://api.minecraftservices.com/minecraft/profile',
      license: 'https://api.minecraftservices.com/entitlements/license',
      entitlements: 'https://api.minecraftservices.com/entitlements/mcstore',
      attributes: 'https://api.minecraftservices.com/player/attributes',
      certificates: 'https://api.minecraftservices.com/player/certificates',
      reportPlayer: 'https://api.minecraftservices.com/player/report'
    },
    minecraftBedrock: {
      XSTSRelyingParty: 'https://multiplayer.minecraft.net/',
      authenticate: 'https://multiplayer.minecraft.net/authentication',
      servicesSessionStart: 'https://authorization.franchise.minecraft-services.net/api/v1.0/session/start'
    },
    xbox: {
      authRelyingParty: 'http://auth.xboxlive.com',
      relyingParty: 'http://xboxlive.com',
      deviceAuth: 'https://device.auth.xboxlive.com/device/authenticate',
      titleAuth: 'https://title.auth.xboxlive.com/title/authenticate',
      userAuth: 'https://user.auth.xboxlive.com/user/authenticate',
      sisuAuthorize: 'https://sisu.xboxlive.com/authorize',
      xstsAuthorize: 'https://xsts.auth.xboxlive.com/xsts/authorize'
    },
    live: {
      deviceCodeRequest: 'https://login.live.com/oauth20_connect.srf',
      tokenRequest: 'https://login.live.com/oauth20_token.srf'
    },
    PlayfabRelyingParty: 'https://b980a380.minecraft.playfabapi.com/',
    PlayfabLoginWithXbox: 'https://20ca2.playfabapi.com/Client/LoginWithXbox'
  },
  msalConfig: {
    // Initialize msal
    // Docs: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md#usage
    auth: {
      // the minecraft client:
      // clientId: "000000004C12AE6F",
      clientId: '389b1b32-b5d5-43b2-bddc-84ce938d6737', // token from https://github.com/microsoft/Office365APIEditor
      authority: 'https://login.microsoftonline.com/consumers'
    }
  },
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MinecraftLauncher/2.2.10675'
    }
  },
  xboxLiveErrors: {
    2148916227: 'Your account was banned by Xbox for violating one or more Community Standards for Xbox and is unable to be used.',
    2148916229: 'Your account is currently restricted and your guardian has not given you permission to play online. Login to https://account.microsoft.com/family/ and have your guardian change your permissions.',
    2148916233: 'Your account currently does not have an Xbox profile. Please create one at https://signup.live.com/signup',
    2148916234: "Your account has not accepted Xbox's Terms of Service. Please login and accept them.",
    2148916235: 'Your account resides in a region that Xbox has not authorized use from. Xbox has blocked your attempt at logging in.',
    2148916236: 'Your account requires proof of age. Please login to https://login.live.com/login.srf and provide proof of age.',
    2148916237: 'Your account has reached the its limit for playtime. Your account has been blocked from logging in.',
    2148916238: 'The account date of birth is under 18 years and cannot proceed unless the account is added to a family by an adult.'
  },
  oneDayMs: 86400000
}
