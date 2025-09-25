import { expect } from "chai";
import hre from "hardhat";
import FileVaultModule from "../ignition/modules/FileVault.js";

describe("FileVault", function () {
  let connection: any;
  let uploader: any, other: any, another: any;
  let fileVault: any;

  // Sample unique 32-byte file hashes and CIDs
  const sampleHash1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const sampleHash2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const sampleHash3 = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

  const cid1 = "QmSampleCid111111111111111111111111111111";
  const cid2 = "QmSampleCid222222222222222222222222222222";
  const cid3 = "QmSampleCid333333333333333333333333333333";

  before(async () => {
    connection = await hre.network.connect();
    [uploader, other, another] = await connection.ethers.getSigners();
  });

  beforeEach(async () => {
    const deployed = await connection.ignition.deploy(FileVaultModule, {
      defaultSender: uploader.address,
    });
    fileVault = deployed.fileVault;
  });

  it("should deploy successfully", async () => {
    expect(await fileVault.getAddress()).to.properAddress;
  });

  it("should allow uploader to store and retrieve a file hash with CID", async () => {
    const tx = await fileVault.storeFileHash(sampleHash1, cid1, []);
    await expect(tx)
      .to.emit(fileVault, "FileUploaded")
      .withArgs(sampleHash1, cid1, uploader.address, []);

    const storedUploader = await fileVault.getUploader(sampleHash1);
    expect(storedUploader).to.equal(uploader.address);

    const storedCid = await fileVault.getCid(sampleHash1);
    expect(storedCid).to.equal(cid1);

    const isAuthorized = await fileVault.isAuthorized(sampleHash1, uploader.address);
    expect(isAuthorized).to.be.false;
  });

  it("should allow a non-uploader to store a new unused file hash", async () => {
    const tx = await fileVault.connect(other).storeFileHash(sampleHash2, cid2, []);
    await expect(tx)
      .to.emit(fileVault, "FileUploaded")
      .withArgs(sampleHash2, cid2, other.address, []);

    const storedUploader = await fileVault.getUploader(sampleHash2);
    expect(storedUploader).to.equal(other.address);

    const storedCid = await fileVault.getCid(sampleHash2);
    expect(storedCid).to.equal(cid2);
  });

  it("should not allow re-uploading an existing file hash by anyone", async () => {
    await fileVault.storeFileHash(sampleHash3, cid3, []);

    await expect(fileVault.storeFileHash(sampleHash3, cid3, []))
      .to.be.revertedWith("File already exists");

    await expect(fileVault.connect(other).storeFileHash(sampleHash3, cid3, []))
      .to.be.revertedWith("File already exists");
  });

  it("should allow uploader to grant access", async () => {
    await fileVault.storeFileHash(sampleHash1, cid1, []);

    const tx = await fileVault.grantAccess(sampleHash1, other.address);
    await expect(tx)
      .to.emit(fileVault, "AccessGranted")
      .withArgs(sampleHash1, other.address);

    expect(await fileVault.isAuthorized(sampleHash1, other.address)).to.be.true;
  });

  it("should allow uploader to revoke access", async () => {
    await fileVault.storeFileHash(sampleHash1, cid1, []);
    await fileVault.grantAccess(sampleHash1, other.address);

    const tx = await fileVault.revokeAccess(sampleHash1, other.address);
    await expect(tx)
      .to.emit(fileVault, "AccessRevoked")
      .withArgs(sampleHash1, other.address);

    expect(await fileVault.isAuthorized(sampleHash1, other.address)).to.be.false;
  });

  it("should not allow non-uploader to grant or revoke access", async () => {
    await fileVault.storeFileHash(sampleHash1, cid1, []);

    await expect(
      fileVault.connect(other).grantAccess(sampleHash1, another.address)
    ).to.be.revertedWith("Not uploader");

    await expect(
      fileVault.connect(other).revokeAccess(sampleHash1, uploader.address)
    ).to.be.revertedWith("Not uploader");
  });

  it("should allow uploader to set initial authorized users", async () => {
    const allowedUsers = [other.address, another.address];
    const tx = await fileVault.storeFileHash(sampleHash1, cid1, allowedUsers);
    await expect(tx)
      .to.emit(fileVault, "FileUploaded")
      .withArgs(sampleHash1, cid1, uploader.address, allowedUsers);

    expect(await fileVault.isAuthorized(sampleHash1, other.address)).to.be.true;
    expect(await fileVault.isAuthorized(sampleHash1, another.address)).to.be.true;
  });
});
