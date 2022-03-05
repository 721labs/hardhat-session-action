describe("Container", async () => {
  it("Connects", async () => {
    const chainId = await web3.eth.getChainId();
    expect(chainId).to.equal(1337);
  });
});
