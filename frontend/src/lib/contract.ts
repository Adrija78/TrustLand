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
] as const;

export const TRUSTLEND_CONTRACT_ADDRESS = import.meta.env.VITE_TRUSTLEND_CONTRACT_ADDRESS ?? '';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const LOCAL_CHAIN_ID = 31337;

export interface ChainSnapshot {
  enabled: boolean;
  address: string;
  chainId: number | null;
  isLocal: boolean;
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
    isLocal: false,
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
  if (message.includes('hardhat local') || message.includes('current network')) {
    return `Switch MetaMask to Hardhat Local (${LOCAL_CHAIN_ID}) before sending demo transactions.`;
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
    const code = await provider.getCode(TRUSTLEND_CONTRACT_ADDRESS);
    if (code === '0x') return demoSnapshot();

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
      isLocal: chainId === LOCAL_CHAIN_ID,
      totalLiquidityEth: formatEther(totalLiquidity),
      totalLoanedEth: formatEther(totalLoaned),
      lenderBalanceEth: formatEther(lenderBalance),
      reputationBadges: Number(reputationBadges),
      minTrustScore: Number(minTrustScore),
      borrowerTrustScore: profile?.exists ? Number(profile.trustScore) : null,
      message: chainId === LOCAL_CHAIN_ID
        ? 'Local Hardhat contract connected.'
        : `Connected to chain ${chainId}. Use local chain ${LOCAL_CHAIN_ID} for this demo contract.`,
    };
  } catch {
    return demoSnapshot();
  }
}

export async function depositToContract(amountEth: string) {
  try {
    const { provider, contract } = await getContract(true);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
      throw new Error(`Switch MetaMask to Hardhat Local (${LOCAL_CHAIN_ID}) before sending demo transactions.`);
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
