// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FirearmToken is ERC721URIStorage, Ownable {
    mapping(uint256 => bytes32) public serialHash;
    uint256 public nextId;

    // explicit base constructor calls (order matches inheritance)
   constructor(address initialOwner) ERC721("FirearmToken", "GUN") Ownable(initialOwner) {}


    function mint(bytes32 _serialHash, string memory _uri) external returns (uint256) {
        uint256 id = nextId;
        nextId++;
        _safeMint(msg.sender, id);
        _setTokenURI(id, _uri);
        serialHash[id] = _serialHash;
        return id;
    }
}
