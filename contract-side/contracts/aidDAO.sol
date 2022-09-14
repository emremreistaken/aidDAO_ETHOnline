// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Base64 } from "./libraries/Base64.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "https://github.com/UMAprotocol/protocol/blob/master/packages/core/contracts/oracle/interfaces/OptimisticOracleV2Interface.sol";

contract aidDAO is ERC721A, Ownable {
    mapping(address => uint) public participationsOfAddress;
    mapping(address => uint) public aidedAmountOfAddress;
    mapping(uint256 => Aid) public aidProposals;
    uint minStakeAmount = 0.01 ether;

    struct Aid {
        uint deadline;
        bool executed;
        uint proposerBonded;
        mapping(address => uint) aiders;

        string description;
        address to;

        bool isNeedReal;
        uint totalFunded;
    }

    uint256 public aidIndex;

    constructor() ERC721A ("aidDAO NFTs", "AID") {
    }

    function createAid(
        address _to,
        string memory _description
    ) external DAOMemberOnly payable {
        require(msg.value > minStakeAmount, "not enough staked");
        Aid storage aid = aidProposals[aidIndex];
        aid.deadline = block.timestamp + 1 days;
        aid.proposerBonded = msg.value;

        aid.description = _description;
        aid.to = _to;

        aidIndex++;
    }

    modifier DAOMemberOnly() {
        require(balanceOf(msg.sender) == 1, "not a dao member");
        _;
    }

    modifier activeAidOnly(uint _aidIndex) {
        require(
            aidProposals[_aidIndex].deadline > block.timestamp,
            "deadline exceeded"
        );
        _;
    }
    
    function joinToAid(uint _aidIndex)
        external
        payable
        DAOMemberOnly
        activeAidOnly(aidIndex)
    {
        Aid storage aid = aidProposals[_aidIndex];
        require(msg.value > 0, "you should aid a bit");

        if(aid.aiders[msg.sender] == 0) {
            participationsOfAddress[msg.sender]++;
        }
        
        aid.aiders[msg.sender] = msg.value;
        aid.totalFunded += msg.value;
    }

    modifier executableAidOnly(uint256 _aidIndex) {
        require(
            aidProposals[_aidIndex].deadline <= block.timestamp,
            "DEADLINE_NOT_EXCEEDED"
        );
        require(
            aidProposals[_aidIndex].executed == false,
            "aid has been made already"
        );
        _;
    }

    function sendAid(uint256 _aidIndex)
        external
        DAOMemberOnly
        executableAidOnly(_aidIndex)
    {
        Aid storage aid = aidProposals[_aidIndex];
        (bool success, ) = address(payable(aid.to)).call{value : aid.totalFunded + aid.proposerBonded}("");
        require(success,"transfer failed");
        
        aid.executed = true;
    }

    /****** DYNAMIC SOULBOUND NFT ******/
    error Soulbound();

    function joinDAO() external payable {
        require(balanceOf(msg.sender) == 0, "you are already a member");
        _safeMint(msg.sender, 1);
    }

    string svg1 = "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:svgjs='http://svgjs.dev/svgjs' viewBox='0 0 700 700' width='700' height='700'><defs><linearGradient gradientTransform='rotate(150, 0.5, 0.5)' x1='50%' y1='0%' x2='50%' y2='100%' id='ffflux-gradient'><style>.t{ font: bold 30px sans-serif; fill: black; }.b{ font: bold 45px sans-serif; fill: black; }</style><stop stop-color='hsl(315, 100%, 72%)' stop-opacity='1' offset='0%'></stop><stop stop-color='hsl(227, 100%, 50%)' stop-opacity='1' offset='100%'></stop></linearGradient><filter id='ffflux-filter' x='-20%' y='-20%' width='140%' height='140%' filterUnits='objectBoundingBox' primitiveUnits='userSpaceOnUse' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.005 0.003' numOctaves='2' seed='2' stitchTiles='stitch' x='0%' y='0%' width='100%' height='100%' result='turbulence'></feTurbulence><feGaussianBlur stdDeviation='20 0' x='0%' y='0%' width='100%' height='100%' in='turbulence' edgeMode='duplicate' result='blur'></feGaussianBlur><feBlend mode='color-dodge' x='0%' y='0%' width='100%' height='100%' in='SourceGraphic' in2='blur' result='blend'></feBlend></filter></defs><rect width='700' height='700' fill='url(#ffflux-gradient)' filter='url(#ffflux-filter)'></rect><text x='50%' y='25%' class='t' dominant-baseline='middle' text-anchor='middle'>Participated aid amount:</text><text x='50%' y='40%' class='b' dominant-baseline='middle' text-anchor='middle'>";
    string svg2 = "</text><text x='50%' y='60%' class='t' dominant-baseline='middle' text-anchor='middle'>Raised aid amount:</text><text x='50%' y='75%' class='b' dominant-baseline='middle' text-anchor='middle'>";
    string svg3 = " ETH</text></svg>";

    function tokenURI(uint tokenId) public view virtual override returns(string memory) {
        uint participated = participationsOfAddress[ownerOf(tokenId)];
        uint raised = aidedAmountOfAddress[ownerOf(tokenId)];

        string memory finalSvg = string(abi.encodePacked(svg1, _toString(participated), svg2, _toString(raised/(10**18)), svg3));

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "aidDao #',
                        _toString(tokenId),
                        '", "description": "A public goods DAO which aims to raise funds to people in need", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(finalSvg)),
                        '"}'
                    )
                )
            )
        );

        string memory finalTokenUri = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return finalTokenUri;
    }

    /*** SOULBOUND LOGIC ***/
    // Transfers are not allowed except minting
    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {
        if(from != address(0)) revert Soulbound();
    }

    /****** UMA FOR CHECKING PROPOSAL LEGITITY (Polygon Mumbai) 
    OptimisticOracleV2Interface oo = OptimisticOracleV2Interface("0x313131313131131");
    bytes32 identifier = bytes32("YES_OR_NO_QUERY");
    bytes ancillaryData = bytes("Question here");
    uint requestTime = 0;

    function requestAnswer() public {
        requestTime = block.timestamp;
        IERC20 bondCurrency = IERC20("0x313131313"); // Mumbai WETH
        uint reward = 0;

        oo.requestPrice(identifier, requestTime, ancillaryData, bondCurrency, reward);
        oo.setCustomLiveness(identifier, requestTime, ancillaryData, 30);
    }

    function settleRequest() public {
        oo.settle(address(this), identifier, requestTime, ancillaryData);
    }

    function getSettledAnswer() public {
        return oo.getRequest(address(this), identifier, requestTime, ancillaryData).resolvedPrice;
    }
    ******/
}