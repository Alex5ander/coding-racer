/**@param data {{name:string; character:number}} */
const network = (data) => {
  const socket = io();

  socket.emit('join', data);

  const onDisconnect = (callback) => socket.on('disconnect', callback);
  const onStart = (callback) => socket.on('start', callback);
  const onUpdate = (callback) => socket.on('update', callback);
  const onEnd = (callback) => socket.on('end', callback);
  const typing = (data, callback) => socket.emit('typing', data, callback);
  const onOpponentDisconnected = (callback) => socket.on('opponent_disconnected', () => {
    callback();
    socket.disconnect();
  });
  const disconnect = () => socket.disconnect();

  return {
    onStart,
    onUpdate,
    onEnd,
    onDisconnect,
    typing,
    disconnect,
    onOpponentDisconnected
  };
}
