/**
 * @fileOverview Test produce and consume messages using kafka-avro.
 */
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var expect = chai.expect;

var testLib = require('../lib/test.lib');

describe('Produce', function() {
  testLib.init();

  beforeEach(function() {
    return this.kafkaAvro.getProducer({
      'dr_cb': true,
    })
      .then(function (producer) {
        this.producer = producer;

        producer.on('event.log', function(log) {
          testLib.log.info('producer log:', log);
        });

        //logging all errors
        producer.on('error', function(err) {
          testLib.log.error('Error from producer:', err);
        });

        producer.on('delivery-report', function() {
          this.gotReceipt = true;
        }.bind(this));

        this.topicName = testLib.topic;
      }.bind(this));
  });
  afterEach(function(done) {
    this.producer.disconnect(function(err) {
      done(err);
    });
  });

  it('should produce a message', function(done) {
    var message = {
      name: 'Thanasis',
      long: 540,
    };
    var key = 'key';

    this.producer.on('delivery-report', function(err, report) {
      expect(err).to.equal(null);
      expect(Buffer.from(report.key).toString('utf8')).to.equal(key);
      expect(report.opaque).to.equal(undefined);
      this.gotReceipt = true;
    });

    this.producer.produce(this.topicName, -1, message, key);

    //need to keep polling for a while to ensure the delivery reports are received
    var pollLoop = setInterval(() => {
      this.producer.poll();
      if (this.gotReceipt) {
        clearInterval(pollLoop);
        done();
      }
    }, 1000);
  });
  it('should produce a message with an opaque value in delivery report', function(done) {
    var message = {
      name: 'Thanasis',
      long: 540,
    };

    var key = 'key';

    var eventTime = Date.now();
    var opaqueRef = 'my-opaque-ref';

    this.producer.on('delivery-report', function(err, report) {
      expect(err).to.equal(null);
      expect(report.opaque).to.equal(opaqueRef);
      this.gotReceipt = true;
    });

    this.producer.produce(this.topicName, -1, message, key, eventTime, opaqueRef);

    //need to keep polling for a while to ensure the delivery reports are received
    var pollLoop = setInterval(() => {
      this.producer.poll();
      if (this.gotReceipt) {
        clearInterval(pollLoop);
        done();
      }
    }, 1000);
  });
  it('should not allow invalid type', function() {
    var message = {
      name: 'Thanasis',
      long: '540',
    };

    var binded = this.producer.produce.bind(this.producer, this.topicName,
      -1, message, 'key');

    // binded returns a promise, we need something like .to.be.rejectedWith(Error)
    expect(binded()).to.eventually.be.rejectedWith(Error);
  });
  it('should not allow less attributes', function() {
    var message = {
      name: 'Thanasis',
    };

    var binded = this.producer.produce.bind(this.producer, this.topicName, -1, message, 'key');

    expect(binded()).to.eventually.be.rejectedWith(Error);
  });

});
