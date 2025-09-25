// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FileVault - On-chain access control for encrypted off-chain storage
/// @notice Stores file hashes and prevents duplicate uploads
contract FileVault {
    struct File {
        address uploader;
        mapping(address => bool) authorized;
    }

    mapping(bytes32 => File) private files;

    event FileUploaded(
        bytes32 indexed fileHash,
        address indexed uploader,
        address[] allowedUsers
    );

    event AccessGranted(bytes32 indexed fileHash, address indexed user);
    event AccessRevoked(bytes32 indexed fileHash, address indexed user);

    /// @notice Upload a new file hash (only if not already uploaded)
    /// @param fileHash SHA-256 hash of the encrypted file
    /// @param allowedUsers List of addresses initially granted access
    function storeFileHash(
        bytes32 fileHash,
        address[] calldata allowedUsers
    ) external {
        require(files[fileHash].uploader == address(0), "File already exists");

        File storage f = files[fileHash];
        f.uploader = msg.sender;

        for (uint256 i = 0; i < allowedUsers.length; i++) {
            f.authorized[allowedUsers[i]] = true;
        }

        emit FileUploaded(fileHash, msg.sender, allowedUsers);
    }

    /// @notice Grant access to a user (only uploader)
    function grantAccess(bytes32 fileHash, address user) external {
        require(files[fileHash].uploader == msg.sender, "Not uploader");
        files[fileHash].authorized[user] = true;
        emit AccessGranted(fileHash, user);
    }

    /// @notice Revoke access from a user (only uploader)
    function revokeAccess(bytes32 fileHash, address user) external {
        require(files[fileHash].uploader == msg.sender, "Not uploader");
        files[fileHash].authorized[user] = false;
        emit AccessRevoked(fileHash, user);
    }

    /// @notice Check if a user is authorized to access a file
    function isAuthorized(
        bytes32 fileHash,
        address user
    ) external view returns (bool) {
        return files[fileHash].authorized[user];
    }

    /// @notice Get the uploader of a file
    function getUploader(bytes32 fileHash) external view returns (address) {
        return files[fileHash].uploader;
    }
}
