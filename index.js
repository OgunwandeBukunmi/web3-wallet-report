import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let address ;
let Errormessages = {}

// fallback provider (Infura + Alchemy)
// const provider = new ethers.FallbackProvider([
//   new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`),
//   new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
// ]);

const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)


async function GetAllNftsNow() {
  const options = { method: "GET", headers: { accept: "application/json" } };
  try {
    const request = await fetch(
      `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=10`,
      options
    );
    if (!request.ok) throw new Error(`Failed to fetch NFTs: ${request.statusText}`);
    const response = await request.json()
    return response.ownedNfts
  } catch (err) {
    Errormessages.NFT = err.message
    console.error("Error fetching NFTs:", err.message);
    return null;
  }
}

// get ETH balance with provider
async function GetEthBalanceProvider() {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatUnits(balance, 18);
  } catch (err) {
     Errormessages.Balance = err.message
    console.error("Error getting balance:", err.message);
    return null;
  }
}

// get ETH balance from Etherscan
async function GetEthBalanceEtherScan() {
  try {
    const request = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.ETHERSCAN}`
    );
    if (!request.ok) throw new Error(`Error: ${request.statusText}`);
    const response = await request.json();
    return ethers.formatUnits(response.result, 18);
  } catch (err) {
    console.error("Error fetching from Etherscan:", err.message);
    return null;
  }
}

// get transfer history from Alchemy
async function GetTransferHistory() {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const headers = { "Accept": "application/json", "Content-Type": "application/json" };
  const body = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: address,
        withMetadata: false,
        excludeZeroValue: true,
        maxCount: "0x3e8",
        category: ["external"]
      }
    ]
  });

  try {
    const request = await fetch(url, { method: "POST", headers, body });
    if (!request.ok) throw new Error(`Error: ${request.statusText}`);
    const response = await request.json();
    return response.transfers
  } catch (err) {
    console.error("Error fetching transfers:", err.message);
    return null;
  }
}

async function GetAllERC20Tokens(){
  const url = `https://api.g.alchemy.com/data/v1/${process.env.ALCHEMY_API_KEY}/assets/tokens/by-address`;
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: `{"addresses":[{"address":"${address}","networks":["eth-mainnet"]}]}`
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  
        return data.data.tokens

} catch (error) {
     Errormessages.Tokens = err.message
  console.error(error.message);
}
}

async function GetPricesForAddress(address) {
  const url = `https://api.g.alchemy.com/prices/v1/${process.env.ALCHEMY_API_KEY}/tokens/by-address`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses: [{ network: "eth-mainnet", address }]
    })
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);

    const data = await response.json();

    if (
      data &&
      data.data &&
      data.data.length > 0 &&
      data.data[0].prices &&
      data.data[0].prices.length > 0
    ) {
      const price = data.data[0].prices[0];
      return {
        currency: price.currency,
        value: price.value
      };
    }

    return null; // return null instead of NaN for cleaner checks
  } catch (error) {
     Errormessages.Prices = error.message
    console.error("Error fetching price:", error.message);
    return null;
  }
}


app.get("/", async (req, res) => {
  try {
  
    // const transfers = await GetTransferHistory();
   
    
  //  
        
//  

  //  
  //   res.send({
  //     address: address,
  //     // ethBalance: ETHbalance,
  //     // transfers]
  //     // orderednfts,
  //     // Erc20tokens
      
  //   });    // Erc20tokens

  res.render("index")
      
    
  } catch (err) {
    console.error("Route error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/wallet",(req,res)=>{
  let {value} = req.body
  console.log(value)
  address = value

  res.redirect("/info")
})
app.get("/info", async (req,res)=>{

    let ETHbalance = await GetEthBalanceProvider();

   let Erc20tokens = await GetAllERC20Tokens() 
   if( Erc20tokens && Erc20tokens !=0){
    Erc20tokens = Erc20tokens.filter(item => item != null);
   }
     
     const nfts = await GetAllNftsNow()
    let orderednfts
     if(nfts && nfts.length != 0){
       orderednfts = await nfts.map((item, i) => {

    return {
        contract_name : item.contract.name,
        address: item.contract.address,
        symbol: item.contract.symbol,
        tokentype: item.tokenType,
        name: item.name,
        image: item.image.pngUrl,
        bannerImage: item.image.thumbnailUrl,
        tokenUri :  item.raw.tokenUri
      
    };
  });
     }
    


   let PricesPerToken = await Promise.all(
    Erc20tokens.map(async (item) => {
      if (!item.tokenAddress) return null;
      let price = await GetPricesForAddress(item.tokenAddress);
      if(price){
        console.log(price,item.tokenBalance , item.tokenAddress)
       return {address : item.tokenAddress, value: price.value *ethers.formatUnits(item.tokenBalance, item.tokenMetadata.decimals), name: item.tokenMetadata.name }
      }
      return null
    })
  );
    PricesPerToken = PricesPerToken.filter(item => item != null);


  res.render("views",{ PricesPerToken,
   ETHbalance,
    orderednfts, Errormessages})
})

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
