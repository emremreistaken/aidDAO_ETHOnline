import { Contract, providers, utils } from 'ethers';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import Web3Modal from 'web3modal';
import { AIDDAO_ABI, AIDDAO_CONTRACT_ADDRESS } from '../constants';
import styles from '../styles/Home.module.css';

export default function Home() {
	// Number of proposals created in the DAO
	const [ aidCounter, setAidCounter ] = useState('0');
	// Array of all proposals created in the DAO
	const [ proposals, setProposals ] = useState([]);
	// One of "Create Proposal" or "View Proposals"
	const [ selectedTab, setSelectedTab ] = useState('');
	// True if waiting for a transaction to be mined, false otherwise.
	const [ loading, setLoading ] = useState(false);
	// True if user has connected their wallet, false otherwise
	const [ description, setDescription ] = useState('');
	const [ proof, setProof ] = useState('');
	const [ to, setTo ] = useState('');
	const [ htf, setHtf ] = useState('0');
	const [ activeCount, setActiveCount ] = useState('0');
	const [ amountToFund, setAmountToFund ] = useState('0');
	const [ indexToFund, setIndexToFund ] = useState('0');

	const [ walletConnected, setWalletConnected ] = useState(false);
	const web3ModalRef = useRef();

	// Helper function to connect wallet
	const connectWallet = async () => {
		try {
			await getProviderOrSigner();
			setWalletConnected(true);
		} catch (error) {
			console.error(error);
		}
	};

	const getActiveCount = async () => {
		try {
			const provider = await getProviderOrSigner();
			const contract = getDaoContractInstance(provider);
			const active = await contract.getActiveAidCount();
			setActiveCount(active.toString());
		} catch (error) {
			console.error(error);
		}
	};

	// Reads the number of proposals in the aidDAO contract and sets the `aidCounter` state variable
	const getNumProposalsInDAO = async () => {
		try {
			const provider = await getProviderOrSigner();
			const contract = getDaoContractInstance(provider);
			const daoNumProposals = await contract.aidCounter();
			setAidCounter(daoNumProposals.toString());
		} catch (error) {
			console.error(error);
		}
	};

	// Calls the `createAid` function in the contract
	const createProposal = async () => {
		try {
			const signer = await getProviderOrSigner(true);
			const daoContract = getDaoContractInstance(signer);
			const txn = await daoContract.createAid(to, description, proof, htf);
			setLoading(true);
			await txn.wait();
			await getActiveCount();
			await getNumProposalsInDAO();
			setLoading(false);
		} catch (error) {
			console.error(error);
		}
	};

	// Calls the `joinToAid` function in the contract
	const makeAid = async (id, amount) => {
		try {
			const signer = await getProviderOrSigner(true);
			const daoContract = getDaoContractInstance(signer);
			const txn = await daoContract.joinToAid(id, { value: utils.parseEther(amount) });
			setLoading(true);
			await txn.wait();
			await getNumProposalsInDAO();
			setLoading(false);
		} catch (error) {
			console.error(error);
		}
	};

	// Calls the `joinDAO` function in the contract
	const joinDAO = async () => {
		try {
			const signer = await getProviderOrSigner(true);
			const daoContract = getDaoContractInstance(signer);
			const txn = await daoContract.joinDAO();
			setLoading(true);
			await txn.wait();
			await getNumProposalsInDAO();
			setLoading(false);
		} catch (error) {
			console.error(error);
		}
	};

	// Helper function to fetch and parse one proposal from the aidDAO contract
	// Given the Proposal ID
	// and converts the returned data into a Javascript object with values we can use
	const fetchProposalById = async (id) => {
		try {
			const provider = await getProviderOrSigner();
			const daoContract = getDaoContractInstance(provider);
			const proposal = await daoContract.aidProposals(id);
			const parsedProposal = {
				aidId: id,
				description: proposal.description,
				deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
				to: proposal.to.toString(),
				totalAided: proposal.totalFunded.toString(),
				executed: proposal.executed,
				real: proposal.isNeedReal
			};
			return parsedProposal;
		} catch (error) {
			console.error(error);
		}
	};

	// Runs a loop `aidCounter` times to fetch all active proposals in the DAO
	const fetchActiveProposals = async () => {
		try {
			const proposals = [];
			for (let i = 0; i < aidCounter; i++) {
				const proposal = await fetchProposalById(i);
				if (proposal.real == true) {
					proposals.push(proposal);
				}
			}
			setProposals(proposals);
			return proposals;
		} catch (error) {
			console.error(error);
		}
	};

	// Calls the `executeProposal` function in the contract, using
	// the passed proposal ID
	const executeProposal = async (id) => {
		try {
			const signer = await getProviderOrSigner(true);
			const daoContract = getDaoContractInstance(signer);
			const txn = await daoContract.sendAid(id);
			setLoading(true);
			await txn.wait();
			setLoading(false);
			await fetchAllProposals();
		} catch (error) {
			console.error(error);
		}
	};

	// Helper function to fetch a Provider/Signer instance from Metamask
	const getProviderOrSigner = async (needSigner = false) => {
		const provider = await web3ModalRef.current.connect();
		const web3Provider = new providers.Web3Provider(provider);

		const { chainId } = await web3Provider.getNetwork();
		if (chainId !== 80001) {
			window.alert('Please switch to the Polygon Mumbai network!');
			throw new Error('Please switch to the Polygon Mumbai network');
		}

		if (needSigner) {
			const signer = web3Provider.getSigner();
			return signer;
		}
		return web3Provider;
	};

	// Helper function to return a DAO Contract instance
	// given a Provider/Signer
	const getDaoContractInstance = (providerOrSigner) => {
		return new Contract(AIDDAO_CONTRACT_ADDRESS, AIDDAO_ABI, providerOrSigner);
	};

	// piece of code that runs everytime the value of `walletConnected` changes
	// so when a wallet connects or disconnects
	// Prompts user to connect wallet if not connected
	// and then calls helper functions to fetch the
	// Number of Proposals in the aidDAO
	useEffect(
		() => {
			if (!walletConnected) {
				web3ModalRef.current = new Web3Modal({
					network: 'rinkeby',
					providerOptions: {},
					disableInjectedProvider: false
				});

				connectWallet().then(() => {
					getActiveCount();
					getNumProposalsInDAO();
				});
			}
		},
		[ walletConnected ]
	);

	// Piece of code that runs everytime the value of `selectedTab` changes
	// Used to re-fetch all proposals in the DAO when user switches
	// to the 'View Proposals' tab
	useEffect(
		() => {
			if (selectedTab === 'View Proposals') {
				fetchActiveProposals();
			}
			getNumProposalsInDAO();
		},
		[ selectedTab ]
	);

	// Render the contents of the appropriate tab based on `selectedTab`
	function renderTabs() {
		if (selectedTab === 'Create Proposal') {
			return renderCreateProposalTab();
		} else if (selectedTab === 'View Proposals') {
			return renderViewProposalsTab();
		} else if (selectedTab === 'Join to aidDAO') {
			return renderJoinDAOTab();
		}
		return null;
	}

	// Renders the 'Join to aidDAO' tab content
	function renderJoinDAOTab() {
		if (loading) {
			return <div className={styles.description}>Loading... Waiting for transaction...</div>;
		} else {
			return (
				<div className={styles.description}>
					You can become a member by minting "aidDAO Membership NFT"
					<br />
					which is a cool Dynamic Soulbound NFT!<br />
					<br />
					Thanks for caring. <br />
					<button className={styles.button2} onClick={joinDAO}>
						Become a member
					</button>
				</div>
			);
		}
	}

	// Renders the 'Create Proposal' tab content
	function renderCreateProposalTab() {
		if (loading) {
			return <div className={styles.description}>Loading... Waiting for transaction...</div>;
		} else if (isMember === 0) {
			return (
				<div className={styles.description}>
					You are not a aidDAO member <br />
					<b>Please become a member before making an aid</b>
				</div>
			);
		} else {
			return (
				<div className={styles.container}>
					<label>Aid Description: </label>
					<input placeholder="Description" type="string" onChange={(e) => setDescription(e.target.value)} />
					<br />
					<label>Proof for Description: </label>
					<input
						placeholder="Link for proof (e.g. https://blabla.com)"
						type="string"
						onChange={(e) => setProof(e.target.value)}
					/>
					<br />
					<label>To address: </label>
					<input placeholder="0x?????" type="string" onChange={(e) => setTo(e.target.value)} />
					<br />
					<label>Hours to be funded: </label>
					<input placeholder="0" type="number" onChange={(e) => setHtf(e.target.value)} />
					<br />
					<button className={styles.button2} onClick={createProposal}>
						Create
					</button>
				</div>
			);
		}
	}

	// Renders the 'View Proposals' tab content
	function renderViewProposalsTab() {
		if (loading) {
			return <div className={styles.description}>Loading... Waiting for transaction...</div>;
		} else if (proposals.length === 0) {
			return <div className={styles.description}>No proposals have been created</div>;
		} else {
			return (
				<div>
					{proposals.map((p, index) => (
						<div key={index} className={styles.proposalCard}>
							<p>Aid ID: {p.aidId}</p>
							<p>Description: {p.description}</p>
							<p>Deadline: {p.deadline.toLocaleString()}</p>
							<p>Total Aided: {(p.totalAided / 10 ** 18).toFixed(2).toString()} $MATIC</p>
							<p>Executed?: {p.executed.toString()}</p>
							{p.deadline.getTime() > Date.now() && !p.executed ? (
								<div className={styles.flex}>
									<label>Amount to donate: </label>
									<input
										placeholder="Aid Amount in $MATIC"
										type="number"
										onChange={(e) => {
											setAmountToFund(e.target.value);
											setIndexToFund(p.aidId);
										}}
									/>
									<br />
									<button
										className={styles.button2}
										onClick={() => makeAid(indexToFund, amountToFund)}
									>
										Send Aid
									</button>
								</div>
							) : p.deadline.getTime() < Date.now() && !p.executed ? (
								<div className={styles.flex}>
									<button
										className={styles.button2}
										onClick={() => {
											setIndexToFund(p.aidId);
											executeProposal(indexToFund);
										}}
									>
										Execute Proposal
									</button>
								</div>
							) : (
								<div className={styles.description}>Proposal Executed</div>
							)}
						</div>
					))}
				</div>
			);
		}
	}

	return (
		<div>
			<Head>
				<title>aidDAO</title>
				<meta name="description" content="aidDAO" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<div className={styles.main}>
				<div>
					<h1 className={styles.title}>aidDAO🆘</h1>
					<div className={styles.description}>Welcome to aidDAO!</div>
					<div className={styles.description}>Active Aids: {activeCount}</div>
					<div className={styles.description}>Aid Proposals Created So Far: {aidCounter}</div>
					<div className={styles.flex}>
						<button className={styles.button} onClick={() => setSelectedTab('Join to aidDAO')}>
							Join to aidDAO
						</button>
						<button className={styles.button} onClick={() => setSelectedTab('Create Proposal')}>
							Create Aid Proposal
						</button>
						<button className={styles.button} onClick={() => setSelectedTab('View Proposals')}>
							View Proven Aids
						</button>
					</div>
					{renderTabs()}
				</div>
				<div>
					<img className={styles.image} src="/aidDAO.jpg" />
				</div>
			</div>

			<footer className={styles.footer}>
				Made with &#10084; by
				<a href="https://twitter.com/0xemremre" target="_blank">
					@0xemremre
				</a>, at ETHOnline 2022.
			</footer>
		</div>
	);
}
