// Face ID / fingerprint support for the app-open lock, on top of the already-installed
// react-native-keychain (no new native dependency needed). A dummy secret is stored under its
// own Keychain/Keystore entry with accessControl set to require biometry, so retrieving it
// always triggers the OS's own biometric prompt - the PIN (see shared.js/App.js) is always set
// too and acts as the fallback if biometrics are unavailable, disabled, or cancelled.
import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE='com.dailyexpensetracker.applock.biometric';

export async function isBiometrySupported(){
 try{
  const type=await Keychain.getSupportedBiometryType();
  return !!type;
 }catch(e){
  return false;
 }
}

export async function enableBiometricUnlock(){
 await Keychain.setGenericPassword('applock','enabled',{
  service:BIOMETRIC_SERVICE,
  accessControl:Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED
 });
}

export async function disableBiometricUnlock(){
 try{
  await Keychain.resetGenericPassword({service:BIOMETRIC_SERVICE});
 }catch(e){
  // Nothing to clean up if there was no biometric entry stored yet - safe to ignore.
 }
}

export async function verifyBiometricUnlock(){
 try{
  const result=await Keychain.getGenericPassword({
   service:BIOMETRIC_SERVICE,
   authenticationPrompt:{title:'Unlock Daily Expense Tracker',cancel:'Use PIN instead'}
  });
  return !!result;
 }catch(e){
  return false;
 }
}
