import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FileVaultModule = buildModule("FileVaultModule", (m) => {
  // Deploy FileVault with no constructor arguments
  const fileVault = m.contract("FileVault", []);

  return { fileVault };
});

export default FileVaultModule;
