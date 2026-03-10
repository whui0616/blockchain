require('dotenv').config();
const { ethers } = require('ethers');

// .env에 저장한 API 키 가져오기
const INFURA_API_KEY = process.env.INFURA_API_KEY;
// 이더리움 메인넷 연결용 공급자(Provider) 설정
const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_API_KEY}`);

async function main() {
    try {
        // 1. 최신 블록 번호 가져오기
        const blockNumber = await provider.getBlockNumber();
        console.log(`[ethers.js] 최신 블록 번호: ${blockNumber}`);

        // 2. 최신 블록의 정보 가져오기 (트랜잭션 포함)
        const block = await provider.getBlock(blockNumber);
        console.log(`[ethers.js] 최신 블록의 트랜잭션 수: ${block.transactions.length}`);

    } catch (error) {
        console.error("에러 발생:", error);
    }
}

main();
