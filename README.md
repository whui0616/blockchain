Ethereum RPC Practice

이 프로젝트는 블록체인 랩 2주차 과제를 위해 생성되었습니다. Infura API를 사용하여 이더리움 메인넷의 데이터를 가져오는 두 가지 방식을 비교합니다.

프로젝트 구조 (Project Structure)

json-rpc/: 순수 JSON-RPC 호출 방식을 사용한 구현 (Assignment #3)

ethers/: ethers.js 라이브러리를 사용한 구현 (Assignment #4)

.env: API Key 등 환경 변수 관리 (보안을 위해 .gitignore에 포함)

설치 방법 (Installation)

프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 필요한 패키지를 설치합니다.

npm install


환경 설정 (Setup)

루트 디렉토리에 .env 파일을 생성하고 발급받은 Infura API Key를 입력합니다.

INFURA_API_KEY=a387a6dcbbb645ccb14a8e95b89974ad


실행 방법 (Usage)

1. JSON-RPC 방식 실행

node json-rpc/index.js


2. ethers.js 방식 실행

node ethers/index.js


주요 학습 내용

JSON-RPC 프로토콜을 이용한 블록체인 노드와의 직접 통신

ethers.js 라이브러리를 이용한 고수준 추상화 통신

.env 파일을 활용한 API Key 보안 관리