<h1>aidDAO (Created at ETHOnline 2022)</h1>
<h1>https://ethglobal.com/showcase/aiddao-k0bco</h1>

<h1>Project Description</h1>
During emergencies like disaster and rapid crisis times, it is hard to coordinate effectively as individuals to deliver help to people in need. Bureaucracies, verifiaction problems and high costs of international transfers are some reasons behind this.

aidDAO is fully on-chain fundraising platform on Polygon for people in emergency/urgent need. aidDAO aims to be main platform for raising funds to disasters and humanitarian crisis in a timely, transparent and “legitimate” way. aidDAO ensures legitimity of its “aids” by using UMA Project’s Optimistic Oracle.

Any individual can join aidDAO by minting a Dynamic Soulbound Membership NFT. aidDAO members are allowed to create aid proposals, by providing information including “description” and “proof for description”. While creating a proposal, they also send the given proof to proposers of UMA’s OO to check legidity. After some time which is called liveness period, aidDAO smart contract can get an answer coming from UMA’s OO which implies whether the proof is legit or not. If the proof is proven legit, all aidDAO members are notified by EPNS to join the aid until the deadline of the proposed aid. aidDAO Membership NFTs keeps track of aid records of members. After deadline, any aidDAO member can execute the aid and send the total funded amount to destination address.

<h1>How it's Made</h1>
aidDAO uses UMA’s OOv2 interface to ask simple “YES-NO” questions to check legidity of proposal proofs. It is great to use UMA’s OO because it is very efficient to eliminate the unnecessary proposals and ensure the legidity. I’ve also integrated EPNS Push Notifications through the smart contract. While getting answer from UMA, if the answer is yes, “notifyDAO” function is called too. aidDAO members gets notified and called to make aid this way. It is a very convenient way for members since they are called only proven emergencies. I’ve build whole project on Polygon since it is likely to store lots of data and make lots of function calls, that means lots of gas and gas ain’t this affordable on other networks. In addition, Polygon is known for being quite fast that is a plus, too. For the frontend, I've used Next.js.
