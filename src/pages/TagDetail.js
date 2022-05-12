import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin} from 'antd';
import classNames from "classnames";
import {LeftOutlined, RightOutlined, LinkOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {fetchTagHistory, fetchTagStats} from "../db_service/service";
import { TinyLine, Line, DualAxes } from '@ant-design/plots';
import Moment from 'moment';


const styles = (theme) => ({

});


const useStyles = makeStyles(styles);

const TagDetail = (props) => {
    const classes = useStyles(props);

    let start = new Moment().subtract(1, 'days');
    let end = new Moment();
    let [dates, setDates] = useState([start, end]);
    let [loading, setLoading] = useState(false);
    const [values, setValues] = useState([]);
    const [stat, setStat] = useState(null);

    // useEffect(()=>{
    //     if(props.tag){
    //         console.log(props.tag);
    //         fetchHistory(dates[0], dates[1]);
    //     }
    // }, [props.tag]);

    const fetchData = async (start, end) => {
        setLoading(true);
        // let res = await fetchTagStats(props.tag.machine.ProdLine, props.tag.id, start.format('YYYY-MM-DD[T]HH:mm:ss'), end.format('YYYY-MM-DD[T]HH:mm:ss'));
        // setStat(res.data.rows[0]);
        console.log('Query Start');
        let res = await fetchTagHistory(props.tag.machine.ProdLine, props.tag.id, start.format('YYYY-MM-DD[T]HH:mm:ss'), end.format('YYYY-MM-DD[T]HH:mm:ss'));
        let rows = res.data.rows.map(e=>{
            e.DateAndTime = e.DateAndTime + '.' + e.Millitm;
            return e
        });
        if(rows.length < 1){
            setLoading(false);
            return
        }
        let vals = rows.map(e=>e.Val);
        setStat({
            mean: vals.reduce((a,b) => a + b, 0) / vals.length,
            stdev: getStandardDeviation(vals),
            min: Math.min(...vals),
            max: Math.max(...vals),
            total_count: vals.length,

        });
        setValues(rows);
        setLoading(false);
    };

    const movePeriod = (add, unit) => {
        let newStart = new Moment(dates[0]).add(add, unit);
        let newEnd = new Moment(dates[1]).add(add, unit);
        setDates([newStart, newEnd]);
    };

    const commaNum = (val) => {
        return val ? val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '';
    };

    const getMedian = (values) => {
        if(values.length ===0) return;

        values.sort((a,b) => a-b);

        let half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];

        return (values[half - 1] + values[half]) / 2.0;
    };

    const getStandardDeviation = (array) => {
        const n = array.length;
        const mean = array.reduce((a, b) => a + b) / n;
        return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    };


    const dispersion = Object.entries(values.reduce((r, e)=>{
        if(!r.hasOwnProperty(e.Val)){
            r[e.Val] = 1
        }else{
            r[e.Val] += 1
        }
        return r
    }, {})).map(e=>({x: e[0], 수량: e[1]}));


    return (
        <Modal
            title={`ProdLine ${props.tag?.machine.ProdLine}. ${props.tag?.machine.EquipName}. ${props.tag?.name}`}
            visible={props.visible}
            onCancel={props.onOk}
            destroyOnClose={true}
            width={'90%'}
            style={{top: 30}}
            footer={[
                <Button key="back" onClick={props.onOk}>
                    확인
                </Button>
            ]}
        >
            <Space direction={'horizontal'}>
                <Button
                    onClick={()=>movePeriod(-5, 'minutes')}
                ><LeftOutlined/> 5분 전</Button>
                <DatePicker.RangePicker
                    allowEmpty={false}
                    showTime={true}
                    value={[dates[0], dates[1]]}
                    onChange={(moments, strs)=>{
                        if(!moments){return}
                        setDates(moments);
                    }}
                    placeholder={['판매일 부터', '까지']}
                />
                <Button
                    onClick={()=>movePeriod(5, 'minutes')}
                >5분 후 <RightOutlined/></Button>
                <Button
                    type={'primary'}
                    onClick={()=>{
                        fetchData(dates[0], dates[1]);
                    }}
                >검색</Button>
            </Space>
            <div style={{color: 'red'}}>*저장 데이터의 양이 많아 5~10분 간격으로 검색하시기를 권고합니다.</div>
            <div style={{marginTop: 50}}>
                {loading ?
                    <div style={{margin: 'auto'}}>
                        데이터를 불러오는 중입니다...<Counter/> <Spin/>
                    </div>:
                    values.length > 0 &&
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap'}}>
                            <div style={{width: window.innerWidth > 600 ? '55%' : '100%', marginTop: 10}}>
                                {console.log(window.innerWidth)}
                                <Descriptions
                                    title="통계 데이터"
                                    bordered
                                    column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 2, xs: 1}}
                                    labelStyle={{width: 100}}
                                >
                                    <Descriptions.Item label="평균">{stat?.mean.toFixed(3)}</Descriptions.Item>
                                    <Descriptions.Item label="표준편차">{stat?.stdev.toFixed(3)}</Descriptions.Item>
                                    <Descriptions.Item label="최소값">{stat?.min}</Descriptions.Item>
                                    <Descriptions.Item label="최대값">{stat?.max}</Descriptions.Item>
                                    <Descriptions.Item label="수신횟수">{stat?.total_count}</Descriptions.Item>
                                </Descriptions>
                            </div>
                            <div style={{marginLeft: 20, width: window.innerWidth > 600 ? '40%' : '100%', marginTop: 10}}>
                                <Typography.Title level={5}>산포도</Typography.Title>
                                <div style={{marginTop: 20}}>
                                    <DualAxes
                                        {...{
                                            data: [dispersion, dispersion],
                                            xField: 'x',
                                            yField: ['수량', '수량',],
                                            geometryOptions: [
                                                {
                                                    geometry: 'column',
                                                },
                                                {
                                                    geometry: 'line',
                                                    smooth: true,
                                                    // seriesField: 'type',
                                                },
                                            ],
                                            padding: [20, 20, 20, 20],
                                            height: 250,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{marginTop: 20}}>
                            <Typography.Title level={5}>추이</Typography.Title>
                            <Line
                                {...{
                                    data: values,
                                    padding: 'auto',
                                    xField: 'DateAndTime',
                                    yField: 'Val',
                                    smooth: true,
                                    // slider: {},
                                    height: 300,
                                    yAxis: {
                                        min: stat?.mean - stat?.stdev * 2,
                                        max: stat?.mean + stat?.stdev * 2,
                                    },
                                    annotations: [
                                        // 低于中位数颜色变化
                                        {
                                            type: 'regionFilter',
                                            start: ['min', stat?.mean],
                                            end: ['max', '0'],
                                            color: '#F4664A',
                                        },
                                        {
                                            type: 'text',
                                            position: ['min', stat?.mean],
                                            content: '평균',
                                            offsetY: -4,
                                            style: {
                                                textBaseline: 'bottom',
                                                fontWeight: 'bolder',
                                            },
                                        },
                                        {
                                            type: 'line',
                                            start: ['min', stat?.mean],
                                            end: ['max', stat?.mean],
                                            style: {
                                                stroke: '#F4664A',
                                                    lineDash: [2, 2],
                                                },
                                            },
                                        ]
                                }}
                            />
                        </div>
                    </div>}
            </div>
        </Modal>
    );
};

export default TagDetail;

const Counter = (props) => {
    const [count, setCount] = useState(0);
    let current = 0;

    useEffect(()=>{
        let interval = setInterval(()=>{
            current += 1;
            console.log(current);
            setCount(current);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span>{count}s</span>
    )
};
