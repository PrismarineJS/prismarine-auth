module.exports = {
  Titles: {
    MinecraftNintendoSwitch: '00000000441cc96b',
    MinecraftJava: '00000000402b5328'
  },
  Authentication: {
    XSTSRelyingParty: 'https://multiplayer.minecraft.net/',
    MinecraftAuth: 'https://multiplayer.minecraft.net/authentication',
    XboxDeviceAuth: 'https://device.auth.xboxlive.com/device/authenticate',
    XboxTitleAuth: 'https://title.auth.xboxlive.com/title/authenticate',
    XstsAuthorize: 'https://xsts.auth.xboxlive.com/xsts/authorize',

    LiveDeviceCodeRequest: 'https://login.live.com/oauth20_connect.srf',
    LiveTokenRequest: 'https://login.live.com/oauth20_token.srf'
  },
  msalConfig: {
    // Initialize msal
    // Docs: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/request.md#public-apis-1
    auth: {
      // the minecraft client:
      // clientId: "000000004C12AE6F",
      clientId: '389b1b32-b5d5-43b2-bddc-84ce938d6737', // token from https://github.com/microsoft/Office365APIEditor
      authority: 'https://login.microsoftonline.com/consumers'
    }
  }

}
