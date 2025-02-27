import { Whitelist } from '../db/models/whitelist';
import { ethers } from 'ethers';
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getWorkingConnection } from '../utils/solana';

// Example list of presale wallet addresses
const presaleWallets = [
    '0x72cb3dc95815c67f933e735d54136d191687d8f5',
    '0x44b6e8afbea51a81f8560eb0e2f5ff03ff12b949',
    '0x49ad790b5ebcd9ce8c713b2e6bfd4d9d1b7d878c',
    '0xe8e207ffca1ffcb280b6e2b87e33bc9daf0b9435',
    '0x0be74772f38cd2b2374f1a644d5e4a264538bdc3',
    // Add more addresses as needed

    '0xf6d03846d93f7054f3afec012fd43bfaa3f7019',
    '0x2d0bf0b8ddd2b2300a6214884bdcd2ff34185bf4',
    '0x527f8be8822cf6f633c7fbae46194deb31a40f1f',
    '0xb3890a46b7713b0b616653e50b784674e6c134cc',
    '0xeb4f3c7873f70f485a84a6c2c245f1080e7c976e',
    '0x2356760eddae65c48a0d0482e13c440b5b97a35e',
    '0x8307bfa3eaca7bcecf6b937425ba4f248657a3b0',
    '0x4957593abe4d94e212c023af80cf543b324c598c',
    '0xcc596bc6753cb82e4383b83bda25b1133a84a5b3',
    '0x9ca5c316c228c79ded7017567568b558f07752c6',
    '0x5984d724043c2b9b530fd359307fb490e427b164',
    '0xe04c789daa3ffecb7383ec3c9ed1073b9f3bfe21',
    '0x55a96ea402216f25c7133e60bb20f00d2aa6f6bf',
    '0x2c7b2c0e07dc695d09945a59010fd551914f00ea',
    '0xb2b9349d62892a07e78be2a57d8fa8b1ab1f18fd',
    '0xa3c3a1e6c160442e8320f80a9fab1b302776c59f',
    '0x3c8424b8ed9a0aef62e63602272c9b21d7dbab56',
    '0xd8cedc40d030f69f0ad1da005895d1eee9d93ade',
    '0xd7156920e193646435d12be25e2b9b0fe2a9f8cb',
    '0x6dba25204fbb7800c9eea52cd2e8a4eb667970b5',
    '0x00a6ae54b48a8c6edaf15aa7250c282d7c395b8b',
    '0x4af48810174a63f1495dcaf0e74af89e0e8e9c72',
    '0xf29a32073c35f228144f3d4b787d76f47ed3771f',
    '0x6eaef7353edeed69c5603babd07e19face5ee6ec',
    '0x2c7b2c0e07dc695d09945a59010fd551914f00ea',
    '0x2c739019895e6e74552afe2de548e92b91da7ba9',
    '0xae620d6b928b153f20e6edb18c995473af1e8fe3',
    '0x39cae88ad6c41d03f92fac947bd785221459ff85',
    '0x3c8424b8ed9a0aef62e63602272c9b21d7dbab56',
    '0x1b2a7509a8b1bb22d598f97e707c88f0980e8e89',
    '0x7a43c11ec9cce5e72850399fa94f3fd44f829400',
    '0xb838137b1e70a83ab6f7a375bfb02ed87cd3c789',
    '0xbe659018e3e8afe7838e6c786996d663a5699813',
    '0xf29a32073c35f228144f3d4b787d76f47ed3771f',
    '0xc6b0f7e747c23f65e1f99617b379fe69b56cee32',
    '0xdf8f8e44d8bc80c2c740e333c3bd7cd8a15ce2f9',
    '0x98d73de5436dc80514573b9238e6d64412f58acb',
    '0x2c739019895e6e74552afe2de548e92b91da7ba9',
    '0x6939695106f17918254e29960e4920c09ba87624',
    '0x61d31b717dea9340b29005214fae2ceadabdf579',
    '0xe663a3482f28c3e6614696f84dc78b71fd108cfb',
    '0xda4eed6ebcca13e45b281f08f4394e470cecccfb',
    '0x824b5b54745dbc9ba8bc14a9a6fdf863c68b8981',
    '0xf4b902ae7278266120a6d35fd4571d14de0aa7e8',
    '0x373e4de28f1947986d3c06b8c057deca89940bce',
    '0x75842121f95feb6a37f78f96ebd9c4c3f85dbba7',
    '0x06ce905f9e2229a0bc62714bc39769bc7242548d',
    '0x463bfa3f6dfa2fe59e215b59e90c0c86716d721b',
    '0x641a5a81048ef74a5b891b7ce1c7db29ebebe234',
    '0x5cb6417f45e4bd8cd3272b59ae93e614596d406e',
    '0xd61b4f52027e0e677e369f28166e368c9609990e',
    '0xf2830011799adb2ae035e033607254b25bfafd97',
    '0x3c8424b8ed9a0aef62e63602272c9b21d7dbab56',
    '0xad8a58532e97f8e214d710427f93a68d03e37f27',
    '0xa278eefb6a2a3a005cc2d84373ffac2c7eb2fcae',
    '0x415e9e87ba7b16729a5e1b27cdfd8aaf09e89dab',
    '0x4957593abe4d94e212c023af80cf543b324c598c',
    '0xda4eed6ebcca13e45b281f08f4394e470cecccfb',
    '0x727226abfe380bbbe0625f5b93b9c99bc6c4b26a',
    '0x66d49fce79447480081db785a224e832d9397594',
    '0xa37956a26da5820ce8d818b39f38f2846966c091',
    '0x73be8e0e8a4a32ebfdf852b7b7fde949336d714a',
    '0x2c739019895e6e74552afe2de548e92b91da7ba9',
    '0xd8cedc40d030f69f0ad1da005895d1eee9d93ade',
    '0x8366eae506f96a69845f05cb2742297c1e0ce3a6',
    '0xbe808123b9171b251879abd2615ea454576a25ef',
    '0x35d52b476e672ab3c444879493f334e50119ac73',
    '0x4feb2ba88364b15efda92460f962ad7e4819ba3c',
    '0x62b0ba40138cead5a783e28e9e4741263c2f7e3b',
    '0x728683e40ce8ef731782622e635771c1f7a1c321',
    '0xc8e80d15bf7a6740cfc50157f3cd554862317591',
    '0xe1d1ce29c69301d2187c451c23932d0b76a15bc2',
    '0x50d1d2fa463d81869e6989d36587264a806b3670',
    '0x4999bcb319c604ff5dc5dfe29159feb4a091f7de',
    '0x8792f760c86bbb3ffffabdfddd63b8d24808bc0f',
    '0x3acccc9bd41782c63d7a2cce2c5cc12ff752f463',
    '0x525aadb22d87caa26b00587dc6bf9a6cc2f414e5',
    '0x531fd876997b43d60079d50978c1a1aba4e240eb',
    '0x5c495bfc61d7d4ea16d9510724c07aa68bcfab5c',
    '0x70a284687cfa0c0c575adb778a51fdecb317c69c',
    '0x3e2c190282dbe0ceea8fcb1889e960a3ef85a187',
    '0xcd1949180b5fa01a47063b57a90613b7be93241c',
    '0x11ed5e29580bd6a04aa3f91e6eba12e0904c136e',
    '0xd48f4afc03ba555e4c00e8af4bef660b022d6111',
    '0xda4eed6ebcca13e45b281f08f4394e470cecccfb',
    '0x1ed9d7eb458b64d0ffa92c9c86b7bf97e8dbd4e8',
    '0x37732851593eede7d6299cd64d5ba4df70bfff78',
    '0xdab5ea767806688a81adfd3317d8d12270750457',
    '0x9b150de62169042c996e763b0f914a17fb9004b5',
    '0xc1ce6fa167bddce0a4e3873f06d0a7284af3b081',
    '0x973ca92242157a0edc861fef26eea1ad9fb551f4',
    '0x6135a1794d04ad3c65b0fb9dbeff5af72b1c89b9',
    '0x64d25f3ac5d69a53b9b097eae327b66f1b6e94eb',
    '0x83257ff1f6ebd6e55f7945afc5365e7339b85a8b',
    '0xab3ef67646b79c67525423b9e20df78499cd752d',
    '0x3c8424b8ed9a0aef62e63602272c9b21d7dbab56',
    '0x75fa10609c86bdde77fbafce4fb9529a1ece9470',
    '0x0f363ce97e7bc1bf08174e6537266c6a1c893b25',
    '0xc5d29da863bf1f37b36c764eca0536bb5e0fda16',
    '0x50a692470bac4d1d7fd3468af4a2de147387dacd',
    '0x7ef582b58946fa05b733215f1f76bbc5a103a382',
    '0x3c8424b8ed9a0aef62e63602272c9b21d7dbab56',
    '0x302cc319e98809b112e8d335745b09144a643c8c',
    '0x571c0c6bafe186a85df38325ba4e421ff295a9f0',
    '0x391cea6e1c804876e4370b8f35b058c8522b62b1',
    '0x9d5ca48d20c22275c922cbabdc18379788f4c749',
    '0xd70973633d5496e95c6ef822bf787f486d4890ac',
    '0xac8566fd11ac971bef0eefd0461d672264551493',
    '0xc94a9b2d56470e73d12d8e186dbf052a80df69bc',
    '0x17a5e8492709b223ab8d7aed62e70395c32e4544',
    '0xd70973633d5496e95c6ef822bf787f486d4890ac',
    '0x9791ca2bff6c98005ba55dcec9e09e27cdad8d7d',
    '0x391cea6e1c804876e4370b8f35b058c8522b62b1',
    '0x0f363ce97e7bc1bf08174e6537266c6a1c893b25',
    '0xf45483d03e72a1c7fac6ac20660e5f5978d35ded',
    '0x983d6028f3a3a924f9a9538d1a3893cc4b46ad63',
    '0x888851dc68c2f675c48b9967dd234dbe0e955fb7',
    '0x398e950ca302b7368ead8709973890bc4811aee7',
    '0xe743a49f04f2f77eb2d3b753ae3ad599de8cea84',
    '0x983d6028f3a3a924f9a9538d1a3893cc4b46ad63',
    '0xb584ce767e5a9be5d15238edfc6821eab9697181',
    '0xd70973633d5496e95c6ef822bf787f486d4890ac',
    '0x2fd8d2342d4277dccaf4f674aac4e5adacff6baf',
    '0x11ed5e29580bd6a04aa3f91e6eba12e0904c136e',
    '0x1cb5396e9779a4d8c3fd37ab253b5e6d8362df6a',
    '0x35a55b0caa6d9ea3d6e1e919e58971447e1f49d0',
    '0x7846362b68d41290a8d73da50f1e0aab536fc418',
    '0xc94a9b2d56470e73d12d8e186dbf052a80df69bc',
    '0x52efd7e83ab66c7d9df4fe582211b82ba1f33c57',
    '0x7924485b895e5af67a290880e4c594cb57513a55',
    '0xc1e549320f048d8149d5b0cb9cb268da59f1f2ad',
    '0x85d1770c96c6449ef6f6f84fd69d9ec0cd25d8ff',
    '0xa4d3316b09125c0d1bbfe757f43d3aae4e4e9d8f',
    '0x989f18cf116c6c4090bdc11dd9a70b5050a4fb6a',
    '0x8f3e8ab6cc8b3d565564256cce95ba9f213c2a0d',
    '0x00165457708c7c45b36106cd6a06acf0d7198688',
    '0x30d2b3076fdb59cc9f2ca7dbf74d9952c550aad1',
    '0xc94a9b2d56470e73d12d8e186dbf052a80df69bc',
    '0xba276dc7e418f04315efa9e41b1d3199fde3e679',
    '0x8078dca4a54429202f18147585ba8b1dad3282a1',
    '0x54f0d8ac50b3810947972a8fa7a754a1e1f41182',
    '0x4b6c5cd97a54ad1283f457f611d4d85d0417193d',
    '0x513a891a8482c5c0a38980adf3a70aac938a5059',
    '0x0c5ab98c527e7afd417c9c76258c3d464556e969',
    '0x9492d85b40e1cb7627b06a2faa673ef9db31f4a0',
    '0xdde13ce77ab940728ac1ac8ba3beada1fba5e054',
    '0xb10a062f66295b20fe8300c6784dd2b7569b268e',
    '0x3985872dc35306b774011fef5c8b7a1c544247a7',
    '0x3ee1c068fc9653489a5d03ab925047efeeb4bc26',
    '0xddafee7c1f70d9fd5651e117710aab3e1947c7da',
    '0x64bf1cbdc42d190c0fee949e9c1faaa14e77916a',
    '0x90391bc315dd4d7c5a92d63613dda3f746f86720',
    '0x4feb2ba88364b15efda92460f962ad7e4819ba3c',
    '0xed30aff40018f0dd60d4b17f0a529b45f5897abc',
    '0xc8e5a4c10122ffa57ce39ba103655578c3c45553',
    '0x24b35945df285b54c85edebb7489a9fcfafdb8dc',
    '0xa7c3d2cd9b6fa9fc33b0182a674fadd09f73e80d',
    '0x10fdd2a80183bfbf3be04bbd8383d67b467aa5f6',
    '0x3ee1c068fc9653489a5d03ab925047efeeb4bc26',
    '0x8792f760c86bbb3ffffabdfddd63b8d24808bc0f',
    '0x20cb38d1bee1ab301e35317e21255ce180642a1d',
    '0x602aa01f018cecf4c9975094987dbd6aa0311118',
    '0x33d39d0c843e7aa98a6de0e5b5337ed309bda122',
    '0x641a5a81048ef74a5b891b7ce1c7db29ebebe234',
    '0xc46e436943f65490d2bb44c9fb7e03f8c22f3396',
    '0xdb735be5af046f35f024462884798751275addd8',
    '0xbb87b97cd47033dd47363f692b29298f574cf113',
    '0x11ed5e29580bd6a04aa3f91e6eba12e0904c136e',
    '0xc46e436943f65490d2bb44c9fb7e03f8c22f3396',
    '0xf2830011799adb2ae035e033607254b25bfafd97',
    '0x6693897221c1d0a09ae3c31e08a56b5a8fcc22a1',
    '0x9804678e106a54aadcfbdc15944bb604c6e5494d',
    '0x2beae9f24b0e70f070371993acaf31ebec92f66d',
    '0xf55ad4dcdd63351cb1a5195fd06a31a31e080133',
    '0xdaff45e15112aa9cd1f3287413f0b6c24b57bc23',
    '0x87e399d72058e42ace5bcb5d3e17a9eeb21d6f20',
    '0xfac64f9ab70562a5824976373c6043e369f1ccfc',
    '0x2beae9f24b0e70f070371993acaf31ebec92f66d',
    '0xc94a9b2d56470e73d12d8e186dbf052a80df69bc',
    '0x708c28c3dd6f8db7a74118411933a10df837ff4f',
    '0x3af44f7796c1253f9fdefa558805e33f6f389e14',
    '0x7774c29565ac078bd3cf96bbf0c856198cc39453',
    '0xa86ff7a8d91a4b2d1e770089e606f979ed292c05',
    '0x898201824248d350f57cb4e0527891cf440e8efa',
    '0x2c739019895e6e74552afe2de548e92b91da7ba9',
    '0x66beed36c658a17d31ba23e6f2a03d9bbb21e590',
    '0x12d99ae1422f8cd199c1002418e456a7da5e29a8',
    '0x47211ccadd5f50b826de0cbfe611acf9e21cefda',
    '0x78d003833389ebd34532841aab64505b38e092f5',
    '0x3d9aa8f65898b5600122fd2b030decfbb24f1cb5',
    '0xb4887adb42946418637060a7182b65b2a4984f3b',
    '0x0b9090ab8eda1ec8e275220df369094480c8e264',
    '0x8e5123048dbb44a1d6322fbcac88317db3d1904e',
    '0xa3437aca4985922c8e80a467292050f5d2b49ece',
    '0xa9b809cfe8d95edbdd61603ba40081ba6da4f24b',
    '0x188531d725b4173396cd214a0348cf238b051147',
    '0xcc0cbd7a6024a49f32b6ef2164648cc08a386b79',
    '0xfed0d3bece3a2db3bee70ff5d41126d1a36c2e9f',
    '0xbd8c2456633685161801ea3628300238fe351b1a',
    '0xb343c17870aa3b15e2a8d5227049afcdd9ef4f3c',
    '0x5faef4a724f460102d0b9bb7f80fda132bc2c06c',
    '0x4ffd356143a6962215649c6c0d2ab35fac23cf90',
    '0x5a02da89d1f0901de089842accca5405782225b2',
    '0x9dcae8f5bcea6350055fbb17808bb610f43ff9ab',
    '0xf621926912d1ba113b2c9f5d9bb42ddb585b22b4',
    '0xd2db964696a802adeef23b09c44fe4564dc6479e',
    '0x9fc92d372f7f5897d99f55513aa6b6c69b0df4f5',
    '0xb5015caab037afcbfd5f63a4fbc846e939d65700',
    '0x758c9f6557d3ea3a4542cc2410cd430ed68cd31d',
    '0xc376ecff7b4b82c8b0a53a3043a0bc0b94c61ac3',
    '0x9c33aa86256156e8414cef946d5171b9820245b3',
    '0x4517cbe5efd19c1981f07087a5714d59719f5931',
    '0x795af134f8c620536ef01df4fa7d755cd190fb2c',
    '0xd36aac0c9676e984d72823fb662ce94d3ab5e551',
    '0xb2ebe8d1e03314348cc795f7fd19ecb8ec02bb58',
    '0x249cb8fe45e4c55078291947914326d585e0f606',
    '0xee07251785f18e5dff90fb02717728ffe468c0d5',
    '0x62583c0434953bf9d3539371bab49144b250dcc0',
    '0xdd346880dfa60ba062048db50599dffd46c4a79b',
    '0x6b029891c1862026e693186faa70a7a42542d8d0',
    '0xeda030a9acbecd8595a3f1a2c72311e23a89fc7a',
    '0x83bfa2efee05b6d11ca9ee14dcafa9328374ca18',
    '0xa94e4a112a26fd2c0db1da753b025b558d6d955f',
    '0x0db2d47548c3cd949f85a8e997feb3ff2ab0e555',
    '0xbf842c92b450613431a5232e6e528670e396386e',
    '0x06ebbc8481652e7da261698cad19ec1b7c23fa51',
    '0x778f3de575355807eaf199dd06c0dbb8c4ca647e',
    '0xb98c0f7fc9a57cddaaa24e520e4f081b32cc92e4',
    '0x9ca9112ef2589dbbb7082aee15bff8a695dc64a7',
    '0xf4cf6906a8bf5639fdb5a75426aa0d267d46d4a9',
    '0x8b1197e315d1c43ae64f64c3973e92b6b0614d29',
    '0x752a4fc627d8f2deba0a51786cfe147d39a24487',
    '0xd814e95d22aa0c413f95a384caf6d0c12394afc1',
    '0xfee46e1788600c8639079aa3039b3a4cce68d588',
    '0x49f65916e05fd9c28c49664d19f8647b915a82a2',
    '0x92b13da868555e283d4478f114f8ba818456da0a',
    '0xcae1eec70cc8c99a4cf41b6d09bb8428b5bca836',
    '0x3b9c0e3483194d1309c423a2f7fdddebdfa80841',
    '0xacb6b8a665cd4fb9df94af9294976f6a0f80dc11',
    '0x38e76eec55f10b12d82786ed32fb2d94186dc21b',
    '0x28590cf869842fe287d809c0296b319a280c1bae',
    '0xcd5a6286f376306c2bbf7a231166beee4f6d1a25',
    '0x14ce1a31460c9a2160a908d40ea2c2f431779109',
    '0x53e1c5c6f1c1788285f384f287f3f538a7e4ffa4',
    '0xdf4a174642527c3d3d90c750f71e9f530c881c5f',
    '0xd46e02339f7f21b9864f456509cde3b4fcc4c693',
    '0x491fb634ad667c8be1d530648b572d6dfe1945c7',
    '0x45dfbb3e0c91b8ddad6a04bad6250c498c2c8442',
    '0x03fbe69505414e8303f16b4caa0ff1c22d7e19f5',
    '0xff469c11cbd57d5fd9549f7f1d384f7cabe28400',
    '0x80eb7e062bda7987a4ff55c680027f7f95549afa',
    '0xd2abd7a3333395a1ed7e54c67edf43ef934033a1',
    '0x45e59342f6d8cda35e9abf2a9d7fee4b1eb3437b',
    '0x96eb73dc1dfea796ea2ea11f748c240b7931744b',
    '0xb335bee51cb875c4b5275211c64eed7267e54da1',
    '0x093362908f9eaa3dd68b807d623c6beaccc6f5ac',
    '0x0dfa4573c89c8248550790336ac00fd843be7524',
    '0x35812082e6363dc84e488bfd1d5700ebcbe7e731',
    '0x7a3c9e36394b621318f9793ba967d5309c1e8f9e',
    '0x602aa01f018cecf4c9975094987dbd6aa0311118',
    '0x83bfa2efee05b6d11ca9ee14dcafa9328374ca18',
    '0xab4b8f0b03caf7fb01530dbeba093184e87adbab'
];

// Define the ERC20 token ABI to interact with token contracts
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

const ETH_RPC_ENDPOINTS = [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com",
    "https://eth.meowrpc.com"
];

const BATCH_SIZE = 10; // Reduce batch size
const DELAY_MS = 2000; // Increase delay to 2 seconds

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBalanceWithRetry(tokenContract: ethers.Contract, walletAddress: string, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const [balance, symbol, name] = await Promise.all([
                tokenContract.balanceOf(walletAddress),
                tokenContract.symbol(),
                tokenContract.name()
            ]);
            return { balance, symbol, name };
        } catch (error) {
            console.error(`Error fetching balance for wallet ${walletAddress}, attempt ${attempt + 1}:`, error);
            if (attempt < retries - 1) {
                await delay(DELAY_MS * (attempt + 1)); // Exponential backoff
            } else {
                throw error;
            }
        }
    }
}

export async function getEthereumTokenBalances(tokenAddress: string) {
    const results = new Map<string, { walletAddress: string, tokens: number, tokenDetails: { name: string, symbol: string, balance: number } }>();

    if (!ethers.isAddress(tokenAddress)) {
        console.error(`Invalid token address: ${tokenAddress}`);
        return [];
    }

    console.log(`Starting token balance fetch for token: ${tokenAddress}`);

    for (const endpoint of ETH_RPC_ENDPOINTS) {
        console.log(`Trying endpoint: ${endpoint}`);
        try {
            const provider = new ethers.JsonRpcProvider(endpoint, 'homestead');
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

            // Process wallets in batches
            for (let i = 0; i < presaleWallets.length; i += BATCH_SIZE) {
                const batch = presaleWallets.slice(i, i + BATCH_SIZE);
                console.log(`Processing batch: ${i / BATCH_SIZE + 1}`);

                const walletPromises = batch.map(async (walletAddress) => {
                    console.log(`Processing wallet: ${walletAddress}`);
                    if (!ethers.isAddress(walletAddress)) {
                        console.error(`Invalid wallet address: ${walletAddress}`);
                        return;
                    }

                    try {
                        console.log(`Fetching balance for wallet: ${walletAddress}`);
                        const result = await fetchBalanceWithRetry(tokenContract, walletAddress);

                        if (!result) {
                            console.error(`Failed to fetch balance for wallet ${walletAddress}: result is undefined`);
                            return;
                        }

                        const { balance, symbol, name } = result;
                        const formattedBalance = Number(ethers.formatUnits(balance, 18));

                        console.log(`Fetched balance for ${walletAddress}: ${formattedBalance} ${symbol}`);

                        // Use a Map to prevent duplicates
                        results.set(walletAddress, {
                            walletAddress,
                            tokens: formattedBalance,
                            tokenDetails: { name, symbol, balance: formattedBalance }
                        });
                    } catch (error) {
                        console.error(`Failed to fetch balance for wallet ${walletAddress} after retries:`, error);
                    }
                });

                // Wait for all wallet promises in the batch to resolve
                await Promise.all(walletPromises);

                // Introduce a delay between batches
                console.log(`Delaying for ${DELAY_MS}ms before next batch`);
                await delay(DELAY_MS);
            }

            // If successful, break out of the loop
            console.log(`Successfully fetched balances using endpoint: ${endpoint}`);
            break;
        } catch (error) {
            console.error(`Error fetching Ethereum token balances from ${endpoint}:`, error);
            // Continue to the next endpoint
        }
    }

    console.log(`Completed token balance fetch for token: ${tokenAddress}`);
    // Convert Map values to an array
    return Array.from(results.values());
}

function isEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function getTokenBalances(walletAddress: string) {
    if (isEthereumAddress(walletAddress)) {
        await getEthereumTokenBalances(walletAddress);
    } else {
        console.log('Solana part is ignored as per the instructions.');
    }
}

export const addWallet = async (walletAddress: string, chain: string, isPresale: boolean) => {
    return Whitelist.findOneAndUpdate(
        { walletAddress },
        { $set: { chain, lastUpdated: new Date(), isPresale } },
        { new: true, upsert: true }
    );
};

export const validatePresaleWallet = (walletAddress: string): boolean => {
    console.log('Validating wallet address:', walletAddress);
    const isValid = presaleWallets.includes(walletAddress.toLowerCase());
    console.log('Is valid presale wallet:', isValid);
    return isValid;
};

interface WalletTokenHolding {
    walletAddress: string;
    tokenAmount: number;
    tokenName?: string;
}

// Helper function to validate Solana address
function isValidSolanaAddress(address: string): boolean {
    try {
        // Check if the string matches Solana address pattern (base58, 32-44 chars)
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
            return false;
        }
        // Try to create a PublicKey (this will validate the address)
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

export async function getTokenHoldersByMint(tokenMintAddress: string, walletAddresses: string[]): Promise<WalletTokenHolding[]> {
    try {
        console.log(`Starting token holder check for mint: ${tokenMintAddress}`);
        console.log(`Total wallets to check: ${walletAddresses.length}`);

        if (!isValidSolanaAddress(tokenMintAddress)) {
            throw new Error(`Invalid Solana token mint address: ${tokenMintAddress}`);
        }

        const connection = await getWorkingConnection();
        const holdings: WalletTokenHolding[] = [];

        const validWallets = walletAddresses.filter(address => {
            const isValid = isValidSolanaAddress(address);
            if (!isValid) {
                console.warn(`Skipping invalid Solana address: ${address}`);
            }
            return isValid;
        });

        console.log(`Valid wallets to process: ${validWallets.length}`);

        for (const walletAddress of validWallets) {
            try {
                console.log(`Checking wallet: ${walletAddress}`);
                const wallet = new PublicKey(walletAddress);

                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    wallet,
                    {
                        mint: new PublicKey(tokenMintAddress),
                        programId: TOKEN_PROGRAM_ID,
                    },
                    'confirmed'
                );

                console.log(`Found ${tokenAccounts.value.length} token accounts for wallet ${walletAddress}`);

                if (tokenAccounts.value.length > 0) {
                    const account = tokenAccounts.value[0];
                    const parsedInfo = account.account.data.parsed.info;
                    const tokenAmount = Number(parsedInfo.tokenAmount.uiAmount);

                    console.log(`Wallet ${walletAddress} holds ${tokenAmount} tokens`);

                    if (tokenAmount > 0) {
                        holdings.push({
                            walletAddress,
                            tokenAmount,
                            tokenName: undefined
                        });
                        console.log(`Added wallet ${walletAddress} to holdings with ${tokenAmount} tokens`);
                    }
                } else {
                    console.log(`No tokens found for wallet ${walletAddress}`);
                }
            } catch (error) {
                console.error(`Error checking wallet ${walletAddress}:`, error);
            }
        }

        console.log(`Found ${holdings.length} wallets with token holdings`);

        // Sort by token amount in descending order
        const sortedHoldings = holdings.sort((a, b) => b.tokenAmount - a.tokenAmount);

        console.log('Final holdings:', JSON.stringify(sortedHoldings, null, 2));
        return sortedHoldings;

    } catch (error) {
        console.error("Error in getTokenHoldersByMint:", error);
        throw error;
    }
}

// Example usage
const walletAddresses = [
    "9JcJD8un5QMaDkwuEMzH56gtr3pkvqc3ftWPqwHHU9vR",
    "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur",
];

const tokenMint = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp";

try {
    const holders = getTokenHoldersByMint(tokenMint, walletAddresses);
    console.log("Token holders:", holders);
} catch (error) {
    console.error("Error:", error);
} 