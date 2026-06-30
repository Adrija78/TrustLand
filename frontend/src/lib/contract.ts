import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';

const TRUSTLEND_ABI = [
  'function totalLiquidity() view returns (uint256)',
  'function totalLoaned() view returns (uint256)',
  'function minTrustScore() view returns (uint256)',
  'function lenderBalances(address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function profiles(address) view returns (uint8 trustScore, uint16 successfulLoans, uint256 totalRepaid, bool exists)',

  'function deposit() payable',
  'function withdraw(uint256 amount)',

  'function requestLoan(uint256 principal, uint256 interestBps, uint256 durationDays, string purpose) returns (uint256)',
  'function repay(uint256 loanId) payable',
  'function repaymentDue(uint256 loanId) view returns (uint256)',

  'function getBorrowerLoans(address borrower) view returns (uint256[])',

  'function getLoan(uint256 loanId) view returns (address,uint256,uint256,uint256,uint256,uint256,string,uint8)',
] as const;

export const TRUSTLEND_CONTRACT_ADDRESS = import.meta.env.VITE_TRUSTLEND_CONTRACT_ADDRESS ?? '';
const ZERO_ADDRESS = '0x000000000000000000000000000000000000000';
export const SEPOLIA_CHAIN_ID = 11155111;

export interface ChainSnapshot {
  enabled: boolean;
  address: string;
  chainId: number | null;
  isSepolia: boolean;
  totalLiquidityEth: string;
  totalLoanedEth: string;
  lenderBalanceEth: string;
  reputationBadges: number;
  minTrustScore: number;
  borrowerTrustScore: number | null;
  message: string;
}

export function hasContractAddress() {
  return TRUSTLEND_CONTRACT_ADDRESS
    && TRUSTLEND_CONTRACT_ADDRESS !== ZERO_ADDRESS
    && /^0x[a-fA-F0-9]{40}$/.test(TRUSTLEND_CONTRACT_ADDRESS);
}

function demoSnapshot(message = 'Blockchain data unavailable. Running in demo mode.'): ChainSnapshot {
  return {
    enabled: false,
    address: TRUSTLEND_CONTRACT_ADDRESS,
    chainId: null,
    isSepolia: false,
    totalLiquidityEth: '0',
    totalLoanedEth: '0',
    lenderBalanceEth: '0',
    reputationBadges: 0,
    minTrustScore: 0,
    borrowerTrustScore: null,
    message,
  };
}

function getUserFacingTransactionError(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === 4001) {
    return 'Transaction was cancelled in MetaMask.';
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('user rejected') || message.includes('user denied')) return 'Transaction was cancelled in MetaMask.';
  if (message.includes('current network') || message.includes('unsupported chain')) {
    return `Switch MetaMask to Sepolia (${SEPOLIA_CHAIN_ID}) before sending transactions.`;
  }
  if (message.includes('insufficient funds')) return 'Insufficient wallet balance for this transaction.';
  if (message.includes('network') || message.includes('could not coalesce')) return 'Blockchain network unavailable. Running in demo mode.';
  return 'Transaction could not be completed. Please check your wallet and try again.';
}

async function getProvider() {
  if (typeof window.ethereum === 'undefined') throw new Error('MetaMask is not available');
  return new BrowserProvider(window.ethereum);
}

async function getContract(withSigner = false) {
  if (!hasContractAddress()) throw new Error('Contract address is not configured');
  const provider = await getProvider();
  const runner = withSigner ? await provider.getSigner() : provider;
  return { provider, contract: new Contract(TRUSTLEND_CONTRACT_ADDRESS, TRUSTLEND_ABI, runner) };
}

export async function getChainSnapshot(account?: string | null): Promise<ChainSnapshot> {
  if (!hasContractAddress()) {
    return demoSnapshot('Demo mode: contract address is not configured.');
  }

  try {
    const { provider, contract } = await getContract();

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("Connected chainId:", chainId);
    console.log("Contract address:", TRUSTLEND_CONTRACT_ADDRESS);

    const code = await provider.getCode(TRUSTLEND_CONTRACT_ADDRESS);

    console.log("Contract bytecode:", code);

    if (code === '0x') {
      throw new Error(
        `No contract found at ${TRUSTLEND_CONTRACT_ADDRESS} on chain ${chainId}`
      );
    }

    const [totalLiquidity, totalLoaned, minTrustScore] = await Promise.all([
      contract.totalLiquidity(),
      contract.totalLoaned(),
      contract.minTrustScore(),
    ]);

    const [lenderBalance, reputationBadges, profile] = account
      ? await Promise.all([
          contract.lenderBalances(account),
          contract.balanceOf(account),
          contract.profiles(account),
        ])
      : [0n, 0n, null];

    return {
      enabled: true,
      address: TRUSTLEND_CONTRACT_ADDRESS,
      chainId,
      isSepolia: chainId === SEPOLIA_CHAIN_ID,
      totalLiquidityEth: formatEther(totalLiquidity),
      totalLoanedEth: formatEther(totalLoaned),
      lenderBalanceEth: formatEther(lenderBalance),
      reputationBadges: Number(reputationBadges),
      minTrustScore: Number(minTrustScore),
      borrowerTrustScore: profile?.exists ? Number(profile.trustScore) : null,
      message:
        chainId === SEPOLIA_CHAIN_ID
          ? 'TrustLend Remix contract connected on Sepolia.'
          : `Connected to unsupported chain ${chainId}. Switch MetaMask to Sepolia.`,
    };
  } catch (error) {
    console.error("========== TRUSTLEND ERROR ==========");
    console.error(error);
    console.error("Contract Address:", TRUSTLEND_CONTRACT_ADDRESS);
    console.error("====================================");

    return demoSnapshot(
      error instanceof Error
        ? error.message
        : 'Blockchain data unavailable. Running in demo mode.'
    );
  }
}

export async function depositToContract(amountEth: string) {
  try {
    const { provider, contract } = await getContract(true);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
       throw new Error('Please switch MetaMask to Sepolia.');
    }
    const code = await provider.getCode(TRUSTLEND_CONTRACT_ADDRESS);
    if (code === '0x') throw new Error('Contract is not deployed on the current network.');
    const tx = await contract.deposit({ value: parseEther(amountEth) });
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch (error) {
    throw new Error(getUserFacingTransactionError(error));
  }
}

export async function requestLoanOnChain(
  principalEth: string,
  interestBps: number,
  durationDays: number,
  purpose: string
) {
  console.log("STEP 1");

  const { provider, contract } = await getContract(true);

  console.log("STEP 2");

  const network = await provider.getNetwork();

  console.log("STEP 3", Number(network.chainId));

  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error("Please switch MetaMask to Sepolia.");
  }

  console.log("STEP 4");

  const tx = await contract.requestLoan(
    parseEther(principalEth),
    interestBps,
    durationDays,
    purpose
  );

  console.log("STEP 5");

  return await tx.wait();
}

export async function repayLoanOnChain(loanId: number) {
  const { provider, contract } = await getContract(true);

  const network = await provider.getNetwork();

  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error("Please switch MetaMask to Sepolia.");
  }

  const loan = await contract.getLoan(loanId);
  const repaymentDue = await contract.repaymentDue(loanId);
  const amountRepaid = loan[5] as bigint;
  const repaymentValue = repaymentDue - amountRepaid;

  if (repaymentValue <= 0n) {
    throw new Error('This loan has no outstanding repayment amount.');
  }

  const tx = await contract.repay(loanId, { value: repaymentValue });

  return await tx.wait();
}
export async function getBorrowerLoansOnChain(address: string) {
  const { contract } = await getContract();

  const ids = await contract.getBorrowerLoans(address);

  const loans = [];

  for (const id of ids) {
    const [loan, repaymentDue] = await Promise.all([
      contract.getLoan(id),
      contract.repaymentDue(id),
    ]);
    const amountRepaid = loan[5] as bigint;
    const remainingDue = repaymentDue > amountRepaid ? repaymentDue - amountRepaid : 0n;

    loans.push({
      id: Number(id),
      borrower: loan[0],
      principal: formatEther(loan[1]),
      amount: formatEther(loan[1]), // UI compatibility
      interestBps: Number(loan[2]),
      durationDays: Number(loan[3]),
      dueDate: Number(loan[4]),
      repaymentDue: formatEther(repaymentDue),
      remainingDue: formatEther(remainingDue),
      amountRepaid: formatEther(amountRepaid),
      amount_repaid: formatEther(amountRepaid), // UI compatibility
      purpose: loan[6],
      status: Number(loan[7]),
    });
  }

  return loans;
}
