import React, { Component } from 'react';
import DVideo from '../abis/DVideo.json'
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3

    //Load accounts 
    const accounts = await web3.eth.getAccounts()

    //Add first account the the state
    this.setState({account : accounts[0]})

    //fetch network
    const networkId = await web3.eth.net.getId()

    // load tokenData
    const dVideoData = DVideo.networks[networkId]
    
    //Check if net data exists, then
    if(dVideoData) {

      //Assign dvideo contract to a variable
      const dVideo = new web3.eth.Contract(DVideo.abi, dVideoData.address)
      //Add dvideo to the state
      this.setState({ dVideo })
      //Check videoCount
      let videoCount = await dVideo.methods.videoCount().call()
      //Add videoCount to the state
      this.setState({ videoCount })

      //Iterate throught videos and add them to the state
      for(let i = 0; i < videoCount; i++) {

        let video = await dVideo.methods.videos(i).call()
        // add each video to videos state
        this.setState({
          videos: [...this.state.videos, video]
        })
      }
      //get latest video
      let latestVideo = await dVideo.methods.videos(videoCount).call()
      this.setState({
        currentHash: latestVideo.hash,
        currentTitle: latestVideo.title
      })
      // upload loading state
      this.setState({
        loading: false
      })
    } else {
      window.alert('memory contract not deployed to this network')
    }

      console.log(this.state)
  }

  //Get video
  captureFile = event => {
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({
        buffer: Buffer(reader.result)
      })
    }
  }

  //Upload video
  uploadVideo = title => {
    console.log('submitting file to IPFS')
    //upload
    ipfs.add(this.state.buffer, (error, result) => {
      
      if(error) {
       
        console.error(error)
        return
      }

      this.setState({ loading: true })
      //put on the blockchain
      this.state.dVideo.methods.uploadVideo(result[0].hash, title)
      .send({ from: this.state.account })
      .on('transactionHash', (hash) => {
      
        this.setState({ loading: false })
      
      })
      
    })
  }

  //Change Video
  changeVideo = (hash, title) => {
    this.setState({
      currentHash: hash,
      currentTitle: title
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      buffer: null,
      account: 'OxO',
      dvideo: null,
      videos: [],
      currentHash: null,
      currentTitle: null

    }

    //Bind functions
  }

  render() {
    return (
      <div>
        <Navbar account={ this.state.account }
          //Account
        />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              captureFile={ this.captureFile }
              uploadVideo={ this.uploadVideo }
              changeVideo={ this.changeVideo }
              currentHash={ this.state.currentHash }
              currentTitle={ this.state.currentTitle }
              videos={ this.state.videos }
            />
        }
      </div>
    );
  }
}

export default App;